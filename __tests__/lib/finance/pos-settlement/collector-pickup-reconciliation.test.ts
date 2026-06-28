import {
  AccountingPeriodStatus,
  Prisma,
} from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import {
  getCollectorPickupSettlementStatus,
  listCollectorPickupSettlementStatuses,
  postCollectorPickupSettlement,
} from "@/lib/finance/pos-settlement"
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
    paymentLines: [{ key: "CASH", label: "CASH", amount: 1000 }],
    dailyCashLines: [{ salesDateYmd: "2026-06-03", cashAmount: 1000, ticketCount: 10 }],
    grandTotal: 1000,
    saleCount: 10,
    refundCount: 0,
    refundTotal: 0,
    netTotal: 1000,
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
    branchCode?: string
    branchName?: string
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
    branch:
      input.branchCode || input.branchName
        ? {
            code: input.branchCode ?? "SH001",
            name: input.branchName ?? "Chidlom",
          }
        : { code: "SH001", name: "Chidlom" },
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
        select?: Record<string, boolean | object>
      }) => {
        const row = state.collectorReports!.find((r) => r.id === where.id) ?? null
        if (!row || !select) return row

        const result: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(select)) {
          if (!value) continue
          if (key === "branch") {
            result.branch = row.branch ?? null
          } else {
            result[key] = row[key as keyof typeof row]
          }
        }
        return result
      },
      findMany: async ({
        where,
        orderBy,
        select,
      }: {
        where?: {
          branchId?: string
          createdAt?: { gte?: Date; lt?: Date }
        }
        orderBy?: { createdAt?: "asc" | "desc" }
        select?: { id?: boolean; reportJson?: boolean }
      }) => {
        let rows = [...state.collectorReports!]
        if (where?.branchId) {
          rows = rows.filter((row) => row.branchId === where.branchId)
        }
        if (where?.createdAt?.gte) {
          rows = rows.filter((row) => row.createdAt >= where.createdAt!.gte!)
        }
        if (where?.createdAt?.lt) {
          rows = rows.filter((row) => row.createdAt < where.createdAt!.lt!)
        }
        if (orderBy?.createdAt === "desc") {
          rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        }
        if (select) {
          return rows.map((row) => {
            const result: Record<string, unknown> = {}
            if (select.id) result.id = row.id
            if (select.reportJson) result.reportJson = row.reportJson
            return result
          })
        }
        return rows
      },
    },
  }

  return { tx: extendedTx, state }
}

function accountId(state: ReturnType<typeof createFinanceMockTx>["state"], code: string) {
  const account = state.glAccounts.find((row) => row.code === code)
  if (!account) throw new Error(`Missing GL account ${code}`)
  return account.id
}

function addJournalLine(
  state: ReturnType<typeof createFinanceMockTx>["state"],
  input: {
    journalEntryId: string
    lineNo: number
    accountCode: string
    debit: string
    credit: string
  }
) {
  state.journalEntryLines.push({
    id: `jel-extra-${input.lineNo}`,
    journalEntryId: input.journalEntryId,
    lineNo: input.lineNo,
    glAccountId: accountId(state, input.accountCode),
    debit: new Prisma.Decimal(input.debit),
    credit: new Prisma.Decimal(input.credit),
    memo: null,
  })
}

describe("collector pickup settlement reconciliation", () => {
  it("returns NOT_POSTED for unposted COLLECT report with full variance", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    seedCollectorReport(state)

    const result = await getCollectorPickupSettlementStatus(
      tx as never,
      "collector-report-1"
    )

    expect(result).toMatchObject({
      collectorReportId: "collector-report-1",
      collectNo: "COL-SH001-202606-0001",
      mode: "COLLECT",
      branchId: "branch-1",
      branchCode: "SH001",
      branchName: "Chidlom",
      expectedAmount: "1000.00",
      voucherId: null,
      voucherNo: null,
      glDebitCashInTransit1031: "0.00",
      glCreditCashDrawer1001: "0.00",
      postedAmountEquivalent: "0.00",
      variance: "1000.00",
      status: "NOT_POSTED",
    })
  })

  it("returns POSTED when Dr 1031 and Cr 1001 equal expected amount", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    await seedOpenPeriod(tx, createdAt)
    seedCollectorReport(state, { createdAt })

    await postCollectorPickupSettlement({
      tx: tx as never,
      collectorReportId: "collector-report-1",
    })

    const result = await getCollectorPickupSettlementStatus(
      tx as never,
      "collector-report-1"
    )

    expect(result).toMatchObject({
      expectedAmount: "1000.00",
      glDebitCashInTransit1031: "1000.00",
      glCreditCashDrawer1001: "1000.00",
      postedAmountEquivalent: "1000.00",
      variance: "0.00",
      status: "POSTED",
    })
    expect(result.voucherId).toBeTruthy()
    expect(result.voucherNo).toBeTruthy()
  })

  it("returns VARIANCE when Dr 1031 does not match expected amount", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    await seedOpenPeriod(tx, createdAt)
    seedCollectorReport(state, { createdAt })
    await postCollectorPickupSettlement({
      tx: tx as never,
      collectorReportId: "collector-report-1",
    })

    const inTransitLine = state.journalEntryLines.find(
      (line) =>
        state.glAccounts.find((account) => account.id === line.glAccountId)?.code ===
        DEFAULT_ACCOUNT_CODES.CASH_IN_TRANSIT_COLLECTOR
    )
    inTransitLine!.debit = new Prisma.Decimal("900.00")

    const result = await getCollectorPickupSettlementStatus(
      tx as never,
      "collector-report-1"
    )

    expect(result).toMatchObject({
      status: "VARIANCE",
      glDebitCashInTransit1031: "900.00",
      glCreditCashDrawer1001: "1000.00",
      postedAmountEquivalent: "900.00",
      variance: "100.00",
    })
  })

  it("returns VARIANCE when Cr 1001 does not match expected amount", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    await seedOpenPeriod(tx, createdAt)
    seedCollectorReport(state, { createdAt })
    await postCollectorPickupSettlement({
      tx: tx as never,
      collectorReportId: "collector-report-1",
    })

    const drawerLine = state.journalEntryLines.find(
      (line) =>
        state.glAccounts.find((account) => account.id === line.glAccountId)?.code ===
        DEFAULT_ACCOUNT_CODES.CASH
    )
    drawerLine!.credit = new Prisma.Decimal("900.00")

    const result = await getCollectorPickupSettlementStatus(
      tx as never,
      "collector-report-1"
    )

    expect(result).toMatchObject({
      status: "VARIANCE",
      glDebitCashInTransit1031: "1000.00",
      glCreditCashDrawer1001: "900.00",
      postedAmountEquivalent: "1000.00",
      variance: "100.00",
    })
  })

  it("ignores revenue, VAT, bank, and clearing lines on the linked voucher", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    await seedOpenPeriod(tx, createdAt)
    seedCollectorReport(state, { createdAt })
    await postCollectorPickupSettlement({
      tx: tx as never,
      collectorReportId: "collector-report-1",
    })

    const journalEntry = state.journalEntries[0]!
    addJournalLine(state, {
      journalEntryId: journalEntry.id,
      lineNo: 10,
      accountCode: DEFAULT_ACCOUNT_CODES.REVENUE,
      debit: "0",
      credit: "1000",
    })
    addJournalLine(state, {
      journalEntryId: journalEntry.id,
      lineNo: 11,
      accountCode: DEFAULT_ACCOUNT_CODES.OUTPUT_VAT,
      debit: "0",
      credit: "70",
    })
    addJournalLine(state, {
      journalEntryId: journalEntry.id,
      lineNo: 12,
      accountCode: DEFAULT_ACCOUNT_CODES.BANK,
      debit: "1000",
      credit: "0",
    })
    addJournalLine(state, {
      journalEntryId: journalEntry.id,
      lineNo: 13,
      accountCode: DEFAULT_ACCOUNT_CODES.CARD_CLEARING,
      debit: "1000",
      credit: "0",
    })

    const result = await getCollectorPickupSettlementStatus(
      tx as never,
      "collector-report-1"
    )

    expect(result.status).toBe("POSTED")
    expect(result.variance).toBe("0.00")
  })

  it("returns INVALID_SOURCE for non-COLLECT report", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    seedCollectorReport(state, {
      report: collectReport({ mode: "Z", grandTotal: 1000 }),
    })

    const result = await getCollectorPickupSettlementStatus(
      tx as never,
      "collector-report-1"
    )

    expect(result).toMatchObject({
      mode: "Z",
      expectedAmount: "1000.00",
      status: "INVALID_SOURCE",
      variance: "0.00",
      postedAmountEquivalent: "0.00",
    })
  })

  it("returns INVALID_SOURCE for zero-amount COLLECT report", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    seedCollectorReport(state, {
      report: collectReport({ grandTotal: 0 }),
    })

    const result = await getCollectorPickupSettlementStatus(
      tx as never,
      "collector-report-1"
    )

    expect(result).toMatchObject({
      mode: "COLLECT",
      expectedAmount: "0.00",
      status: "INVALID_SOURCE",
      variance: "0.00",
    })
  })

  it("ignores unrelated voucher with same amount but different refId", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    await seedOpenPeriod(tx, createdAt)
    seedCollectorReport(state, { createdAt, id: "collector-report-1" })
    seedCollectorReport(state, {
      id: "collector-report-2",
      collectNo: "COL-SH001-202606-0002",
      createdAt,
    })

    await postCollectorPickupSettlement({
      tx: tx as never,
      collectorReportId: "collector-report-2",
    })

    const result = await getCollectorPickupSettlementStatus(
      tx as never,
      "collector-report-1"
    )

    expect(result).toMatchObject({
      status: "NOT_POSTED",
      variance: "1000.00",
      voucherId: null,
    })
  })

  it("lists collector pickup settlement statuses by branch and date range", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    await seedOpenPeriod(tx, createdAt)
    seedCollectorReport(state, {
      id: "collector-report-1",
      createdAt,
    })
    seedCollectorReport(state, {
      id: "collector-report-2",
      collectNo: "COL-SH001-202606-0002",
      branchId: "branch-2",
      createdAt: new Date("2026-06-20T10:00:00.000Z"),
    })

    await postCollectorPickupSettlement({
      tx: tx as never,
      collectorReportId: "collector-report-1",
    })

    const results = await listCollectorPickupSettlementStatuses(tx as never, {
      branchId: "branch-1",
      from: "2026-06-01",
      to: "2026-06-30",
    })

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      collectorReportId: "collector-report-1",
      status: "POSTED",
    })
  })

  it("excludes non-COLLECT reports from status-list", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    seedCollectorReport(state, { id: "collector-report-collect", createdAt })
    seedCollectorReport(state, {
      id: "collector-report-z",
      collectNo: "COL-SH001-202606-0002",
      createdAt,
      report: collectReport({ mode: "Z", grandTotal: 500 }),
    })

    const results = await listCollectorPickupSettlementStatuses(tx as never, {
      from: "2026-06-01",
      to: "2026-06-30",
    })

    expect(results).toHaveLength(1)
    expect(results[0]?.collectorReportId).toBe("collector-report-collect")
    expect(results[0]?.mode).toBe("COLLECT")
  })
})
