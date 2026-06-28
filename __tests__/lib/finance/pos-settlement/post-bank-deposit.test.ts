import {
  AccountingPeriodStatus,
  Prisma,
} from "@/generated/prisma/client"
import {
  DEFAULT_ACCOUNT_CODES,
  resolveAccountsForPosBankDeposit,
} from "@/lib/finance/account-map"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import {
  postBankDepositSettlement,
  postCollectorPickupSettlement,
  PosSettlementError,
  PosSettlementErrorCodes,
} from "@/lib/finance/pos-settlement"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import { createFinanceMockTx } from "../mock-finance-tx"
import {
  extendFinanceTxWithCollectorReportAndPayInEvidence,
  seedUploadedPayInEvidence,
} from "./pay-in-evidence-test-helpers"

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
  return tx.accountingPeriod.create({
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
  return extendFinanceTxWithCollectorReportAndPayInEvidence(base)
}

async function seedCollectorPickupPosted(
  tx: ReturnType<typeof extendFinanceTxWithCollectorReport>["tx"],
  state: ReturnType<typeof extendFinanceTxWithCollectorReport>["state"],
  collectorReportId: string,
  createdAt: Date
) {
  await seedOpenPeriod(tx, createdAt)
  await postCollectorPickupSettlement({
    tx: tx as never,
    collectorReportId,
  })
  const report = state.collectorReports!.find((row) => row.id === collectorReportId)!
  seedUploadedPayInEvidence(state, {
    id: report.id,
    collectNo: report.collectNo,
    branchId: report.branchId,
  })
}

describe("resolveAccountsForPosBankDeposit", () => {
  it("builds Dr 1021 / Cr 1031 bank deposit only", () => {
    const lines = resolveAccountsForPosBankDeposit("1000.00")
    expect(lines).toEqual([
      expect.objectContaining({
        accountCode: DEFAULT_ACCOUNT_CODES.BANK,
        debit: expect.anything(),
        credit: expect.objectContaining({ toString: expect.any(Function) }),
      }),
      expect.objectContaining({
        accountCode: DEFAULT_ACCOUNT_CODES.CASH_IN_TRANSIT_COLLECTOR,
        debit: expect.objectContaining({ toString: expect.any(Function) }),
        credit: expect.anything(),
      }),
    ])
    expect(lines[0]?.debit.toString()).toBe("1000")
    expect(lines[1]?.credit.toString()).toBe("1000")
  })
})

describe("postBankDepositSettlement", () => {
  it("posts Dr 1021 / Cr 1031 for 1,000.00 bank deposit", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    seedCollectorReport(state, { createdAt })
    await seedCollectorPickupPosted(tx, state, "collector-report-1", createdAt)

    const result = await postBankDepositSettlement({
      tx: tx as never,
      collectorReportId: "collector-report-1",
    })

    expect(result.alreadyPosted).toBe(false)
    expect(state.vouchers).toHaveLength(2)
    const depositVoucher = state.vouchers.find(
      (v) => v.refType === FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT
    )
    expect(depositVoucher).toMatchObject({
      refType: FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT,
      refId: "collector-report-1",
      refNo: "COL-SH001-202606-0001",
      legalEntityCode: "AS",
    })

    const depositJournal = state.journalEntries.find(
      (entry) => entry.voucherId === depositVoucher!.id
    )
    const depositLines = state.journalEntryLines.filter(
      (line) => line.journalEntryId === depositJournal!.id
    )
    const codes = depositLines.map((line) => {
      const account = state.glAccounts.find((a) => a.id === line.glAccountId)
      return account?.code
    })
    expect(codes.sort()).toEqual([
      DEFAULT_ACCOUNT_CODES.BANK,
      DEFAULT_ACCOUNT_CODES.CASH_IN_TRANSIT_COLLECTOR,
    ])

    const bank = depositLines.find(
      (line) =>
        state.glAccounts.find((a) => a.id === line.glAccountId)?.code ===
        DEFAULT_ACCOUNT_CODES.BANK
    )
    const inTransit = depositLines.find(
      (line) =>
        state.glAccounts.find((a) => a.id === line.glAccountId)?.code ===
        DEFAULT_ACCOUNT_CODES.CASH_IN_TRANSIT_COLLECTOR
    )
    expect(bank?.debit.toFixed(2)).toBe("1000.00")
    expect(inTransit?.credit.toFixed(2)).toBe("1000.00")

    const forbidden = [
      DEFAULT_ACCOUNT_CODES.REVENUE,
      DEFAULT_ACCOUNT_CODES.OUTPUT_VAT,
      DEFAULT_ACCOUNT_CODES.CARD_CLEARING,
      DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING,
      DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING,
      DEFAULT_ACCOUNT_CODES.CASH,
    ]
    for (const code of forbidden) {
      expect(codes).not.toContain(code)
    }
  })

  it("does not touch revenue or output VAT accounts", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    seedCollectorReport(state, { createdAt })
    await seedCollectorPickupPosted(tx, state, "collector-report-1", createdAt)

    await postBankDepositSettlement({
      tx: tx as never,
      collectorReportId: "collector-report-1",
    })

    const depositVoucher = state.vouchers.find(
      (v) => v.refType === FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT
    )
    const depositJournal = state.journalEntries.find(
      (entry) => entry.voucherId === depositVoucher!.id
    )
    const depositLines = state.journalEntryLines.filter(
      (line) => line.journalEntryId === depositJournal!.id
    )
    const touchedCodes = depositLines.map(
      (line) => state.glAccounts.find((a) => a.id === line.glAccountId)?.code
    )
    expect(touchedCodes).not.toContain(DEFAULT_ACCOUNT_CODES.REVENUE)
    expect(touchedCodes).not.toContain(DEFAULT_ACCOUNT_CODES.OUTPUT_VAT)
  })

  it("rejects duplicate posting for the same collector report", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    seedCollectorReport(state, { createdAt })
    await seedCollectorPickupPosted(tx, state, "collector-report-1", createdAt)

    await postBankDepositSettlement({
      tx: tx as never,
      collectorReportId: "collector-report-1",
    })

    await expect(
      postBankDepositSettlement({
        tx: tx as never,
        collectorReportId: "collector-report-1",
      })
    ).rejects.toMatchObject({ code: PosSettlementErrorCodes.DUPLICATE_SOURCE })

    expect(
      state.vouchers.filter(
        (v) => v.refType === FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT
      )
    ).toHaveLength(1)
  })

  it("blocks posting when accounting period is closed", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    await seedOpenPeriod(tx, createdAt)
    seedCollectorReport(state, { createdAt })
    await postCollectorPickupSettlement({
      tx: tx as never,
      collectorReportId: "collector-report-1",
    })
    seedUploadedPayInEvidence(state, {
      id: "collector-report-1",
      collectNo: "COL-SH001-202606-0001",
      branchId: "branch-1",
    })

    state.accountingPeriods[0]!.status = AccountingPeriodStatus.CLOSED

    await expect(
      postBankDepositSettlement({
        tx: tx as never,
        collectorReportId: "collector-report-1",
      })
    ).rejects.toMatchObject({ code: "PERIOD_CLOSED" })

    expect(
      state.vouchers.filter(
        (v) => v.refType === FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT
      )
    ).toHaveLength(0)
  })

  it("rejects AD / ASAD legal entity for POS settlement", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    seedCollectorReport(state, { createdAt })
    await seedCollectorPickupPosted(tx, state, "collector-report-1", createdAt)

    await expect(
      postBankDepositSettlement({
        tx: tx as never,
        collectorReportId: "collector-report-1",
        legalEntityCode: "AD",
      })
    ).rejects.toMatchObject({
      code: PosSettlementErrorCodes.FORBIDDEN_LEGAL_ENTITY,
    })
  })

  it("rejects bank deposit when PAY-IN slip evidence is missing", async () => {
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
      postBankDepositSettlement({
        tx: tx as never,
        collectorReportId: "collector-report-1",
      })
    ).rejects.toMatchObject({
      code: PosSettlementErrorCodes.PAY_IN_SLIP_REQUIRED,
    })
  })

  it("rejects bank deposit when collector pickup not posted", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    await seedOpenPeriod(tx, createdAt)
    seedCollectorReport(state, { createdAt })

    await expect(
      postBankDepositSettlement({
        tx: tx as never,
        collectorReportId: "collector-report-1",
      })
    ).rejects.toMatchObject({
      code: PosSettlementErrorCodes.COLLECTOR_PICKUP_NOT_POSTED,
    })

    expect(state.vouchers).toHaveLength(0)
  })
})

describe("postBankDepositSettlement errors", () => {
  it("throws FinancePostingError for zero deposit amount lines", () => {
    expect(() => resolveAccountsForPosBankDeposit("0")).toThrow(
      FinancePostingError
    )
  })
})
