import {
  AccountingPeriodStatus,
  Prisma,
} from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import {
  getBankDepositSettlementStatus,
  listBankDepositSettlementStatuses,
  postBankDepositSettlement,
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
        select?: { id?: boolean }
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
        if (select?.id) {
          return rows.map((row) => ({ id: row.id }))
        }
        return rows
      },
    },
  }

  return { tx: extendedTx, state }
}

describe("bank deposit settlement reconciliation", () => {
  it("returns NOT_ELIGIBLE when collector pickup not posted", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    seedCollectorReport(state)

    const result = await getBankDepositSettlementStatus(
      tx as never,
      "collector-report-1"
    )

    expect(result).toMatchObject({
      collectorReportId: "collector-report-1",
      collectNo: "COL-SH001-202606-0001",
      mode: "COLLECT",
      inTransitAmount: "1000.00",
      collectorPickupVoucherId: null,
      collectorPickupVoucherNo: null,
      voucherId: null,
      voucherNo: null,
      glDebitBank1021: "0.00",
      glCreditCashInTransit1031: "0.00",
      postedAmountEquivalent: "0.00",
      variance: "1000.00",
      status: "NOT_ELIGIBLE",
    })
  })

  it("returns NOT_POSTED when pickup posted but bank deposit not posted", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    await seedOpenPeriod(tx, createdAt)
    seedCollectorReport(state, { createdAt })

    await postCollectorPickupSettlement({
      tx: tx as never,
      collectorReportId: "collector-report-1",
    })

    const result = await getBankDepositSettlementStatus(
      tx as never,
      "collector-report-1"
    )

    expect(result).toMatchObject({
      inTransitAmount: "1000.00",
      collectorPickupVoucherNo: expect.any(String),
      voucherId: null,
      voucherNo: null,
      status: "NOT_POSTED",
      variance: "1000.00",
    })
  })

  it("returns POSTED when Dr 1021 and Cr 1031 equal in-transit amount", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    await seedOpenPeriod(tx, createdAt)
    seedCollectorReport(state, { createdAt })

    await postCollectorPickupSettlement({
      tx: tx as never,
      collectorReportId: "collector-report-1",
    })
    await postBankDepositSettlement({
      tx: tx as never,
      collectorReportId: "collector-report-1",
    })

    const result = await getBankDepositSettlementStatus(
      tx as never,
      "collector-report-1"
    )

    expect(result).toMatchObject({
      inTransitAmount: "1000.00",
      glDebitBank1021: "1000.00",
      glCreditCashInTransit1031: "1000.00",
      postedAmountEquivalent: "1000.00",
      variance: "0.00",
      status: "POSTED",
    })
    expect(result.voucherId).toBeTruthy()
    expect(result.voucherNo).toBeTruthy()
    expect(result.collectorPickupVoucherNo).toBeTruthy()
  })

  it("returns VARIANCE when Dr 1021 does not match expected amount", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    await seedOpenPeriod(tx, createdAt)
    seedCollectorReport(state, { createdAt })

    await postCollectorPickupSettlement({
      tx: tx as never,
      collectorReportId: "collector-report-1",
    })
    await postBankDepositSettlement({
      tx: tx as never,
      collectorReportId: "collector-report-1",
    })

    const bankLine = state.journalEntryLines.find(
      (line) =>
        state.glAccounts.find((account) => account.id === line.glAccountId)?.code ===
        DEFAULT_ACCOUNT_CODES.BANK
    )
    bankLine!.debit = new Prisma.Decimal("900.00")

    const result = await getBankDepositSettlementStatus(
      tx as never,
      "collector-report-1"
    )

    expect(result).toMatchObject({
      status: "VARIANCE",
      glDebitBank1021: "900.00",
      glCreditCashInTransit1031: "1000.00",
      postedAmountEquivalent: "900.00",
      variance: "100.00",
    })
  })

  it("returns INVALID_SOURCE for non-COLLECT report", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    seedCollectorReport(state, {
      report: collectReport({ mode: "Z", grandTotal: 1000 }),
    })

    const result = await getBankDepositSettlementStatus(
      tx as never,
      "collector-report-1"
    )

    expect(result).toMatchObject({
      mode: "Z",
      inTransitAmount: "1000.00",
      status: "INVALID_SOURCE",
      variance: "0.00",
    })
  })

  it("lists bank deposit settlement statuses by branch and date range", async () => {
    const base = createFinanceMockTx()
    const { tx, state } = extendFinanceTxWithCollectorReport(base)
    const createdAt = new Date("2026-06-26T10:00:00.000Z")
    await seedOpenPeriod(tx, createdAt)
    seedCollectorReport(state, { id: "collector-report-1", createdAt })
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
    await postBankDepositSettlement({
      tx: tx as never,
      collectorReportId: "collector-report-1",
    })

    const results = await listBankDepositSettlementStatuses(tx as never, {
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
})
