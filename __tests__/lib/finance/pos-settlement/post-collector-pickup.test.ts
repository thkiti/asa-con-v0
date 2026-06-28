import {
  AccountingPeriodStatus,
  Prisma,
} from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import {
  extractCollectorPickupCashAmount,
  postCollectorPickupSettlement,
  PosSettlementError,
  PosSettlementErrorCodes,
} from "@/lib/finance/pos-settlement"
import { resolveAccountsForPosCollectorPickup } from "@/lib/finance/account-map"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import { createFinanceMockTx } from "../mock-finance-tx"

function collectReport(overrides: Partial<ReadReportPayload> = {}): ReadReportPayload {
  return {
    mode: "COLLECT",
    collectNo: "COL-SH001-202606-0001",
    bangkokDate: "2026-06-03 – 2026-06-05",
    bangkokDateFrom: "2026-06-03",
    bangkokDateTo: "2026-06-05",
    generatedAt: "2026-06-26T08:16:00.000Z",
    staffId: "001",
    staffName: "Collector Staff",
    branchCode: "SH001",
    branchName: "Chidlom",
    groupLines: [],
    paymentLines: [
      { key: "CASH", label: "CASH", amount: 1000 },
      { key: "CREDIT_CARD", label: "CREDIT CARD", amount: 500 },
    ],
    dailyCashLines: [{ salesDateYmd: "2026-06-03", cashAmount: 1000, ticketCount: 10 }],
    grandTotal: 1000,
    saleCount: 10,
    refundCount: 0,
    refundTotal: 0,
    netTotal: 1500,
    ...overrides,
  }
}

async function seedOpenPeriod(
  tx: ReturnType<typeof createFinanceMockTx>["tx"],
  date: Date
) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  await tx.accountingPeriod.create({
    data: {
      branchId: "branch-1",
      periodKey: `${y}-${m}`,
      legalEntityCode: "AS",
      status: AccountingPeriodStatus.OPEN,
    },
  })
}

function seedCollectorReport(
  state: ReturnType<typeof createFinanceMockTx>["state"],
  input: {
    id?: string
    branchId?: string
    collectNo?: string
    report?: ReadReportPayload
    createdAt?: Date
  } = {}
) {
  const id = input.id ?? "collector-report-1"
  const report = input.report ?? collectReport()
  const row = {
    id,
    branchId: input.branchId ?? "branch-1",
    staffId: "staff-collector",
    collectNo: input.collectNo ?? report.collectNo ?? "COL-SH001-202606-0001",
    reportJson: report,
    createdAt: input.createdAt ?? new Date("2026-06-26T10:00:00.000Z"),
  }
  state.collectorReports = state.collectorReports ?? []
  state.collectorReports.push(row)
  return row
}

function extendFinanceTxWithCollectorReport(
  base: ReturnType<typeof createFinanceMockTx>
) {
  const { tx, state } = base
  state.collectorReports = state.collectorReports ?? []

  const extendedTx = {
    ...tx,
    collectorReport: {
      findUnique: async ({
        where,
        select,
      }: {
        where: { id: string }
        select?: Record<string, boolean>
      }) => {
        const row = state.collectorReports!.find((r) => r.id === where.id) ?? null
        if (!row || !select) return row
        const result: Record<string, unknown> = {}
        for (const key of Object.keys(select)) {
          if (select[key]) result[key] = row[key as keyof typeof row]
        }
        return result
      },
    },
  }

  return { tx: extendedTx, state }
}

describe("extractCollectorPickupCashAmount", () => {
  it("uses COLLECT grandTotal as cash-only pickup amount", () => {
    const amount = extractCollectorPickupCashAmount(collectReport())
    expect(amount.toFixed(2)).toBe("1000.00")
  })

  it("rejects non-COLLECT report mode", () => {
    expect(() =>
      extractCollectorPickupCashAmount(collectReport({ mode: "Z", grandTotal: 1000 }))
    ).toThrow(PosSettlementError)
  })
})

describe("resolveAccountsForPosCollectorPickup", () => {
  it("builds Dr 1031 / Cr 1001 custody transfer only", () => {
    const lines = resolveAccountsForPosCollectorPickup("1000.00")
    expect(lines).toEqual([
      expect.objectContaining({
        accountCode: DEFAULT_ACCOUNT_CODES.CASH_IN_TRANSIT_COLLECTOR,
        debit: expect.anything(),
        credit: expect.objectContaining({ toString: expect.any(Function) }),
      }),
      expect.objectContaining({
        accountCode: DEFAULT_ACCOUNT_CODES.CASH,
        debit: expect.objectContaining({ toString: expect.any(Function) }),
        credit: expect.anything(),
      }),
    ])
    expect(lines[0]?.debit.toString()).toBe("1000")
    expect(lines[1]?.credit.toString()).toBe("1000")
  })
})

describe("postCollectorPickupSettlement", () => {
  it("posts Dr 1031 / Cr 1001 for 1,000.00 collector pickup", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    await seedOpenPeriod(tx, createdAt)
    seedCollectorReport(state, { createdAt })

    const result = await postCollectorPickupSettlement({
      tx: tx as never,
      collectorReportId: "collector-report-1",
    })

    expect(result.alreadyPosted).toBe(false)
    expect(state.vouchers).toHaveLength(1)
    expect(state.vouchers[0]).toMatchObject({
      refType: FINANCE_REF_TYPES.POS_SETTLEMENT_COLLECTOR_PICKUP,
      refId: "collector-report-1",
      refNo: "COL-SH001-202606-0001",
      legalEntityCode: "AS",
    })

    const journalLines = state.journalEntryLines
    const codes = journalLines.map((line) => {
      const account = state.glAccounts.find((a) => a.id === line.glAccountId)
      return account?.code
    })
    expect(codes.sort()).toEqual([
      DEFAULT_ACCOUNT_CODES.CASH,
      DEFAULT_ACCOUNT_CODES.CASH_IN_TRANSIT_COLLECTOR,
    ])

    const inTransit = journalLines.find(
      (line) =>
        state.glAccounts.find((a) => a.id === line.glAccountId)?.code ===
        DEFAULT_ACCOUNT_CODES.CASH_IN_TRANSIT_COLLECTOR
    )
    const drawer = journalLines.find(
      (line) =>
        state.glAccounts.find((a) => a.id === line.glAccountId)?.code ===
        DEFAULT_ACCOUNT_CODES.CASH
    )
    expect(inTransit?.debit.toFixed(2)).toBe("1000.00")
    expect(drawer?.credit.toFixed(2)).toBe("1000.00")

    const forbidden = [
      DEFAULT_ACCOUNT_CODES.REVENUE,
      DEFAULT_ACCOUNT_CODES.OUTPUT_VAT,
      DEFAULT_ACCOUNT_CODES.CARD_CLEARING,
      DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING,
      DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING,
      DEFAULT_ACCOUNT_CODES.BANK,
    ]
    for (const code of forbidden) {
      expect(codes).not.toContain(code)
    }
  })

  it("does not touch revenue or output VAT accounts", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    await seedOpenPeriod(tx, createdAt)
    seedCollectorReport(state, { createdAt })

    await postCollectorPickupSettlement({
      tx: tx as never,
      collectorReportId: "collector-report-1",
    })

    const touchedCodes = state.journalEntryLines.map(
      (line) => state.glAccounts.find((a) => a.id === line.glAccountId)?.code
    )
    expect(touchedCodes).not.toContain(DEFAULT_ACCOUNT_CODES.REVENUE)
    expect(touchedCodes).not.toContain(DEFAULT_ACCOUNT_CODES.OUTPUT_VAT)
  })

  it("rejects duplicate posting for the same collector report", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    await seedOpenPeriod(tx, createdAt)
    seedCollectorReport(state, { createdAt })

    await postCollectorPickupSettlement({
      tx: tx as never,
      collectorReportId: "collector-report-1",
    })

    await expect(
      postCollectorPickupSettlement({
        tx: tx as never,
        collectorReportId: "collector-report-1",
      })
    ).rejects.toMatchObject({ code: PosSettlementErrorCodes.DUPLICATE_SOURCE })

    expect(state.vouchers).toHaveLength(1)
    expect(state.journalEntries).toHaveLength(1)
  })

  it("blocks posting when accounting period is closed", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    const period = await tx.accountingPeriod.create({
      data: {
        branchId: "branch-1",
        periodKey: "2026-06",
        legalEntityCode: "AS",
        status: AccountingPeriodStatus.CLOSED,
      },
    })
    void period
    seedCollectorReport(state, { createdAt })

    await expect(
      postCollectorPickupSettlement({
        tx: tx as never,
        collectorReportId: "collector-report-1",
      })
    ).rejects.toMatchObject({ code: "PERIOD_CLOSED" })

    expect(state.vouchers).toHaveLength(0)
  })

  it("rejects AD / ASAD legal entity for POS settlement", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    await seedOpenPeriod(tx, createdAt)
    seedCollectorReport(state, { createdAt })

    await expect(
      postCollectorPickupSettlement({
        tx: tx as never,
        collectorReportId: "collector-report-1",
        legalEntityCode: "AD",
      })
    ).rejects.toMatchObject({
      code: PosSettlementErrorCodes.FORBIDDEN_LEGAL_ENTITY,
    })
  })

  it("ignores card payment lines and uses cash grandTotal only", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    await seedOpenPeriod(tx, createdAt)
    seedCollectorReport(state, {
      createdAt,
      report: collectReport({
        grandTotal: 750,
        paymentLines: [
          { key: "CASH", label: "CASH", amount: 750 },
          { key: "CREDIT_CARD", label: "CREDIT CARD", amount: 2000 },
        ],
      }),
    })

    await postCollectorPickupSettlement({
      tx: tx as never,
      collectorReportId: "collector-report-1",
    })

    const inTransit = state.journalEntryLines.find(
      (line) =>
        state.glAccounts.find((a) => a.id === line.glAccountId)?.code ===
        DEFAULT_ACCOUNT_CODES.CASH_IN_TRANSIT_COLLECTOR
    )
    expect(inTransit?.debit.toFixed(2)).toBe("750.00")
  })
})

describe("postCollectorPickupSettlement errors", () => {
  it("throws FinancePostingError for zero pickup amount lines", () => {
    expect(() => resolveAccountsForPosCollectorPickup("0")).toThrow(
      FinancePostingError
    )
  })
})
