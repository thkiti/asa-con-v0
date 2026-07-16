import { PaymentMethod, Prisma, RefundKind } from "@/generated/prisma/client"
import { resolveAccountsForPosRefund } from "@/lib/finance/account-map"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import { createRefund } from "@/lib/pos/refund"
import { prisma } from "@/lib/shared/prisma"
import {
  aggregateLineLevelVat,
  groupHistoricalRefundDocuments,
  isLegacyRefundTransNo,
  parseLegacyRefundSourceRecord,
} from "@/lib/pos/historical-pos-refund/source"
import { createLegacyHistoricalRefund } from "@/lib/pos/historical-pos-refund/create"
import type { HistoricalRefundDocument } from "@/lib/pos/historical-pos-refund/types"
import { createRefundMockTx, seedSaleWithReceipt } from "./mock-refund-tx"

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}))

jest.mock("@/lib/finance/config", () => ({
  isFinancePostingEnabled: () => false,
}))


const d = (n: string) => new Prisma.Decimal(n)

/** January 2026 SAE.dbf R* fixture (absolute line amounts). */
const JAN_2026_LINES: Array<{
  branch: string
  date: string
  trans: string
  time: string
  staff: string
  product: string
  amounts: number[]
}> = [
  { branch: "006", date: "10/01/2026", trans: "R00000742", time: "10:00:00", staff: "146", product: "0101013", amounts: [60] },
  { branch: "006", date: "11/01/2026", trans: "R00000743", time: "10:00:00", staff: "146", product: "0101180", amounts: [80] },
  { branch: "006", date: "18/01/2026", trans: "R00000744", time: "10:00:00", staff: "146", product: "0105012", amounts: [380, 380] },
  { branch: "024", date: "08/01/2026", trans: "R00000602", time: "10:00:00", staff: "158", product: "0105013", amounts: [380] },
  { branch: "024", date: "14/01/2026", trans: "R00000603", time: "10:00:00", staff: "126", product: "4101003", amounts: [660] },
  { branch: "024", date: "19/01/2026", trans: "R00000604", time: "10:00:00", staff: "158", product: "0102007", amounts: [100, 100, 100, 100] },
  { branch: "024", date: "21/01/2026", trans: "R00000605", time: "10:00:00", staff: "126", product: "4101003", amounts: [660] },
  { branch: "025", date: "06/01/2026", trans: "R00000648", time: "10:00:00", staff: "126", product: "4101003", amounts: [660] },
  { branch: "025", date: "14/01/2026", trans: "R00000649", time: "10:00:00", staff: "156", product: "3103006", amounts: [540] },
  { branch: "026", date: "07/01/2026", trans: "R00000191", time: "10:00:00", staff: "013", product: "0101003", amounts: [80] },
  { branch: "026", date: "10/01/2026", trans: "R00000192", time: "10:00:00", staff: "013", product: "0101003", amounts: [480] },
  { branch: "026", date: "12/01/2026", trans: "R00000193", time: "10:00:00", staff: "013", product: "3103006", amounts: [540] },
  { branch: "026", date: "22/01/2026", trans: "R00000194", time: "10:00:00", staff: "126", product: "4101003", amounts: [660] },
]

function buildJanFixtureRows() {
  const rows = []
  let sourceRowNo = 1
  for (const doc of JAN_2026_LINES) {
    for (const amount of doc.amounts) {
      const parsed = parseLegacyRefundSourceRecord(
        {
          S_TRANS: doc.trans,
          S_DATE: doc.date,
          S_TIME: doc.time,
          S_ID: doc.branch,
          E_ID: doc.staff,
          I_ID: doc.product,
          S_QTY: 1,
          S_AMOUNT: -amount,
        },
        sourceRowNo
      )
      if (!parsed) throw new Error(`failed parse row ${sourceRowNo}`)
      rows.push(parsed)
      sourceRowNo += 1
    }
  }
  return rows
}

describe("historical POS refund source", () => {
  it("selects only S_TRANS values that start with R", () => {
    expect(isLegacyRefundTransNo("R000001")).toBe(true)
    expect(isLegacyRefundTransNo(" R000001")).toBe(true)
    expect(isLegacyRefundTransNo("000001")).toBe(false)
    expect(isLegacyRefundTransNo("AR0001")).toBe(false)
    // Marker is prefix R (legacy SAE uses R######); free-text REFUND also starts with R
    // but does not appear as S_TRANS in SAE.dbf.
    expect(isLegacyRefundTransNo("")).toBe(false)
  })

  it("converts negative source amounts to positive refund line amounts", () => {
    const row = parseLegacyRefundSourceRecord(
      {
        S_TRANS: "R00000742",
        S_DATE: "10/01/2026",
        S_TIME: "12:00:00",
        S_ID: "006",
        E_ID: "146",
        I_ID: "0101013",
        S_QTY: 1,
        S_AMOUNT: -60,
      },
      1
    )
    expect(row?.amountSigned).toBe(-60)
    expect(row?.amountAbs).toBe(60)
  })

  it("groups multiple lines into one refund document", () => {
    const rows = buildJanFixtureRows()
    const docs = groupHistoricalRefundDocuments("SAE.dbf", rows)
    const multi = docs.find((d) => d.legacyTransNo === "R00000604")
    expect(multi?.sourceRowCount).toBe(4)
    expect(multi?.gross.toFixed(2)).toBe("400.00")
  })

  it("filters by Bangkok month via dateKey range", () => {
    const rows = buildJanFixtureRows()
    const jan = rows.filter((r) => r.dateKey >= "2026-01-01" && r.dateKey < "2026-02-01")
    const feb = rows.filter((r) => r.dateKey >= "2026-02-01" && r.dateKey < "2026-03-01")
    expect(jan).toHaveLength(17)
    expect(feb).toHaveLength(0)
  })

  it("uses line-level VAT rounding matching January control totals", () => {
    const rows = buildJanFixtureRows()
    expect(rows).toHaveLength(17)
    const docs = groupHistoricalRefundDocuments("SAE.dbf", rows)
    expect(docs).toHaveLength(13)

    let gross = d("0")
    let net = d("0")
    let vat = d("0")
    for (const doc of docs) {
      gross = gross.plus(doc.gross)
      net = net.plus(doc.net)
      vat = vat.plus(doc.vat)
    }

    expect(gross.toFixed(2)).toBe("5960.00")
    expect(net.toFixed(2)).toBe("5570.09")
    expect(vat.toFixed(2)).toBe("389.91")
    expect(net.plus(vat).toFixed(2)).toBe(gross.toFixed(2))
  })

  it("uses line-level VAT (not document-level) for multi-line refunds", () => {
    const lineLevel = aggregateLineLevelVat([100, 100, 100, 100])
    const docLevel = aggregateLineLevelVat([400])
    expect(lineLevel.gross.toFixed(2)).toBe("400.00")
    expect(docLevel.gross.toFixed(2)).toBe("400.00")
    expect(lineLevel.vat.toFixed(2)).toBe("26.16")
    expect(docLevel.vat.toFixed(2)).toBe("26.17")
    expect(lineLevel.vat.toFixed(2)).not.toBe(docLevel.vat.toFixed(2))
  })
})

describe("historical unlinked refund create vs live refund", () => {
  const branchId = "branch-1"
  const defaultReasonCode = "KEY_BLANK_MISTAKE"

  function buildDoc(
    branchIdValue: string,
    overrides: Partial<HistoricalRefundDocument> = {}
  ): HistoricalRefundDocument {
    const economics = aggregateLineLevelVat([60])
    return {
      key: "SAE.dbf|006|2026-01-10|R00000742",
      sourceFileName: "SAE.dbf",
      legacyBranchId: "006",
      legacyTransNo: "R00000742",
      legacyRefundDate: "2026-01-10",
      legacyRefundTime: "10:00:00",
      refundAt: new Date("2026-01-10T03:00:00.000Z"),
      branchCode: "SH006",
      branchId: branchIdValue,
      staffId: null,
      legacyStaffId: "146",
      lines: [],
      sourceRowCount: 1,
      gross: economics.gross,
      net: economics.net,
      vat: economics.vat,
      vatEconomics: economics.vatEconomics,
      skipReason: null,
      ...overrides,
    }
  }

  it("allows LEGACY_HISTORICAL refund without sale/receipt", async () => {
    const { tx, state } = createRefundMockTx()

    const result = await createLegacyHistoricalRefund(tx, buildDoc(branchId))
    expect(result.alreadyImported).toBe(false)
    expect(result.refundNo).toBe("REF-H-SH006-20260110-R00000742")
    expect(state.refunds).toHaveLength(1)
    expect(state.refunds[0]?.kind).toBe(RefundKind.LEGACY_HISTORICAL)
    expect(state.refunds[0]?.saleId).toBeNull()
    expect(state.refunds[0]?.originalReceiptId).toBeNull()
    expect(state.legacyRefundReferences).toHaveLength(1)
  })

  it("is import-idempotent via LegacyRefundReference", async () => {
    const { tx, state } = createRefundMockTx()
    const first = await createLegacyHistoricalRefund(tx, buildDoc(branchId))
    const second = await createLegacyHistoricalRefund(tx, buildDoc(branchId))
    expect(first.alreadyImported).toBe(false)
    expect(second.alreadyImported).toBe(true)
    expect(second.refundId).toBe(first.refundId)
    expect(state.refunds).toHaveLength(1)
    expect(state.legacyRefundReferences).toHaveLength(1)
  })

  it("live createRefund still requires original receipt", async () => {
    const { tx } = createRefundMockTx()
    await expect(
      createRefund({ branchId, amount: "25.00", reasonCode: defaultReasonCode, tx })
    ).rejects.toMatchObject({
      code: "RECEIPT_REQUIRED_FOR_REFUND",
    })
  })

  it("live createRefund still creates SALE_LINKED only", async () => {
    const { tx, state } = createRefundMockTx()
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)
    )
    const { saleId } = seedSaleWithReceipt(state, {
      branchId,
      total: "100.00",
    })
    const result = await createRefund({
      saleId,
      branchId,
      reasonCode: defaultReasonCode,
    })
    expect(result.kind).toBe(RefundKind.SALE_LINKED)
    expect(result.saleId).toBe(saleId)
    expect(result.originalReceiptId).toBeTruthy()
  })
})


describe("historical refund accounting accounts", () => {
  it("posts Dr 5001 / Dr 4602 / Cr 1001 with no COGS or inventory", () => {
    const economics = aggregateLineLevelVat([660])
    const lines = resolveAccountsForPosRefund({
      paymentMethod: PaymentMethod.CASH,
      amount: economics.gross,
      vatEconomics: economics.vatEconomics,
    })

    expect(lines.map((l) => l.accountCode).sort()).toEqual([
      DEFAULT_ACCOUNT_CODES.CASH,
      DEFAULT_ACCOUNT_CODES.OUTPUT_VAT,
      DEFAULT_ACCOUNT_CODES.REVENUE,
    ].sort())
    expect(lines.some((l) => l.accountCode === DEFAULT_ACCOUNT_CODES.COGS)).toBe(false)
    expect(lines.some((l) => l.accountCode === DEFAULT_ACCOUNT_CODES.INVENTORY)).toBe(false)

    const debit = lines.reduce((s, l) => s.plus(l.debit), d("0"))
    const credit = lines.reduce((s, l) => s.plus(l.credit), d("0"))
    expect(debit.toFixed(2)).toBe(credit.toFixed(2))
    expect(credit.toFixed(2)).toBe(economics.gross.toFixed(2))
  })
})
