import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import { addMoney, roundMoney, toMoney, ZERO } from "@/lib/finance/decimal"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import type { ReadReportMode, ReadReportPayload } from "@/lib/pos/read-report-types"
import { normalizeDateRange } from "@/lib/reporting/date-range"
import {
  PosSettlementError,
  PosSettlementErrorCodes,
} from "./pos-settlement-errors"

export type CollectorPickupSettlementStatus =
  | "NOT_POSTED"
  | "POSTED"
  | "VARIANCE"
  | "INVALID_SOURCE"

export type CollectorPickupSettlementReconciliation = {
  collectorReportId: string
  collectNo: string
  mode: ReadReportMode | null
  branchId: string
  branchCode: string | null
  branchName: string | null
  expectedAmount: string
  voucherId: string | null
  voucherNo: string | null
  glDebitCashInTransit1031: string
  glCreditCashDrawer1001: string
  postedAmountEquivalent: string
  variance: string
  status: CollectorPickupSettlementStatus
}

export type ListCollectorPickupSettlementStatusesInput = {
  branchId?: string
  from?: Date | string
  to?: Date | string
}

type CollectorPickupReconciliationDb = Pick<
  PrismaClient,
  "collectorReport" | "voucher"
>

type SettlementJournalLine = {
  debit: Prisma.Decimal | number | string
  credit: Prisma.Decimal | number | string
  glAccount: { code: string }
}

type CollectorReportRow = {
  id: string
  collectNo: string
  branchId: string
  reportJson: unknown
  branch?: { code: string; name: string } | null
}

type LinkedSettlementVoucher = {
  id: string
  voucherNo: string
  journalEntry: {
    lines: SettlementJournalLine[]
  } | null
} | null

function formatAmount(amount: ReturnType<typeof toMoney>): string {
  return roundMoney(amount).toFixed(2)
}

function parseReportPayload(reportJson: unknown): ReadReportPayload | null {
  if (reportJson == null || typeof reportJson !== "object") {
    return null
  }
  return reportJson as ReadReportPayload
}

function deriveExpectedAmount(report: ReadReportPayload | null): {
  mode: ReadReportMode | null
  expectedAmount: ReturnType<typeof toMoney>
  isValidSource: boolean
} {
  if (!report) {
    return { mode: null, expectedAmount: ZERO, isValidSource: false }
  }

  const expectedAmount = toMoney(report.grandTotal)
  const isValidSource = report.mode === "COLLECT" && expectedAmount.gt(ZERO)

  return {
    mode: report.mode,
    expectedAmount,
    isValidSource,
  }
}

function sumSettlementJournalAmounts(lines: SettlementJournalLine[]): {
  debitCashInTransit: ReturnType<typeof toMoney>
  creditCashDrawer: ReturnType<typeof toMoney>
} {
  let debitCashInTransit = ZERO
  let creditCashDrawer = ZERO

  for (const line of lines) {
    const code = line.glAccount.code
    if (code === DEFAULT_ACCOUNT_CODES.CASH_IN_TRANSIT_COLLECTOR) {
      debitCashInTransit = addMoney(debitCashInTransit, toMoney(line.debit))
    } else if (code === DEFAULT_ACCOUNT_CODES.CASH) {
      creditCashDrawer = addMoney(creditCashDrawer, toMoney(line.credit))
    }
  }

  return { debitCashInTransit, creditCashDrawer }
}

function settlementVariance(
  expected: ReturnType<typeof toMoney>,
  debitCashInTransit: ReturnType<typeof toMoney>,
  creditCashDrawer: ReturnType<typeof toMoney>
): ReturnType<typeof toMoney> {
  const exp = roundMoney(expected)
  const debitGap = roundMoney(exp.minus(debitCashInTransit).abs())
  const creditGap = roundMoney(exp.minus(creditCashDrawer).abs())
  const internalGap = roundMoney(debitCashInTransit.minus(creditCashDrawer).abs())

  return roundMoney(
    debitGap.greaterThan(creditGap)
      ? debitGap.greaterThan(internalGap)
        ? debitGap
        : internalGap
      : creditGap.greaterThan(internalGap)
        ? creditGap
        : internalGap
  )
}

function resolveSettlementStatus(input: {
  isValidSource: boolean
  expectedAmount: ReturnType<typeof toMoney>
  voucher: LinkedSettlementVoucher
  debitCashInTransit: ReturnType<typeof toMoney>
  creditCashDrawer: ReturnType<typeof toMoney>
}): Pick<
  CollectorPickupSettlementReconciliation,
  "status" | "postedAmountEquivalent" | "variance"
> {
  if (!input.isValidSource) {
    return {
      status: "INVALID_SOURCE",
      postedAmountEquivalent: "0.00",
      variance: "0.00",
    }
  }

  const expected = roundMoney(input.expectedAmount)
  const debit = roundMoney(input.debitCashInTransit)
  const credit = roundMoney(input.creditCashDrawer)
  const hasPostedJournal =
    input.voucher?.journalEntry != null && input.voucher.journalEntry.lines.length > 0

  if (!input.voucher || !hasPostedJournal) {
    return {
      status: "NOT_POSTED",
      postedAmountEquivalent: "0.00",
      variance: formatAmount(expected),
    }
  }

  if (
    expected.gt(ZERO) &&
    debit.equals(expected) &&
    credit.equals(expected) &&
    debit.equals(credit)
  ) {
    return {
      status: "POSTED",
      postedAmountEquivalent: formatAmount(expected),
      variance: "0.00",
    }
  }

  return {
    status: "VARIANCE",
    postedAmountEquivalent: formatAmount(debit),
    variance: formatAmount(
      settlementVariance(expected, debit, credit)
    ),
  }
}

function buildCollectorPickupSettlementReconciliation(
  source: CollectorReportRow,
  report: ReadReportPayload | null,
  voucher: LinkedSettlementVoucher
): CollectorPickupSettlementReconciliation {
  const { mode, expectedAmount, isValidSource } = deriveExpectedAmount(report)
  const journalLines = voucher?.journalEntry?.lines ?? []
  const { debitCashInTransit, creditCashDrawer } =
    sumSettlementJournalAmounts(journalLines)
  const statusFields = resolveSettlementStatus({
    isValidSource,
    expectedAmount,
    voucher,
    debitCashInTransit,
    creditCashDrawer,
  })

  return {
    collectorReportId: source.id,
    collectNo: source.collectNo,
    mode,
    branchId: source.branchId,
    branchCode: source.branch?.code ?? report?.branchCode ?? null,
    branchName: source.branch?.name ?? report?.branchName ?? null,
    expectedAmount: formatAmount(expectedAmount),
    voucherId: voucher?.id ?? null,
    voucherNo: voucher?.voucherNo ?? null,
    glDebitCashInTransit1031: formatAmount(debitCashInTransit),
    glCreditCashDrawer1001: formatAmount(creditCashDrawer),
    postedAmountEquivalent: statusFields.postedAmountEquivalent,
    variance: statusFields.variance,
    status: statusFields.status,
  }
}

async function loadLinkedSettlementVoucher(
  db: CollectorPickupReconciliationDb,
  collectorReportId: string
): Promise<LinkedSettlementVoucher> {
  return db.voucher.findUnique({
    where: {
      refType_refId: {
        refType: FINANCE_REF_TYPES.POS_SETTLEMENT_COLLECTOR_PICKUP,
        refId: collectorReportId,
      },
    },
    include: {
      journalEntry: {
        include: {
          lines: {
            orderBy: { lineNo: "asc" },
            include: {
              glAccount: { select: { code: true } },
            },
          },
        },
      },
    },
  })
}

export async function getCollectorPickupSettlementStatus(
  db: CollectorPickupReconciliationDb,
  collectorReportId: string
): Promise<CollectorPickupSettlementReconciliation> {
  const id = String(collectorReportId ?? "").trim()
  if (!id) {
    throw new PosSettlementError(
      "collectorReportId is required",
      PosSettlementErrorCodes.COLLECTOR_REPORT_NOT_FOUND,
      400
    )
  }

  const source = await db.collectorReport.findUnique({
    where: { id },
    select: {
      id: true,
      collectNo: true,
      branchId: true,
      reportJson: true,
      branch: { select: { code: true, name: true } },
    },
  })

  if (!source) {
    throw new PosSettlementError(
      "Collector report not found",
      PosSettlementErrorCodes.COLLECTOR_REPORT_NOT_FOUND,
      404
    )
  }

  const report = parseReportPayload(source.reportJson)
  const voucher = await loadLinkedSettlementVoucher(db, source.id)

  return buildCollectorPickupSettlementReconciliation(source, report, voucher)
}

export async function listCollectorPickupSettlementStatuses(
  db: CollectorPickupReconciliationDb,
  input: ListCollectorPickupSettlementStatusesInput = {}
): Promise<CollectorPickupSettlementReconciliation[]> {
  const where: Prisma.CollectorReportWhereInput = {}
  if (input.branchId) {
    where.branchId = input.branchId
  }
  if (input.from != null && input.to != null) {
    const range = normalizeDateRange({ from: input.from, to: input.to })
    where.createdAt = { gte: range.start, lt: range.endExclusive }
  }

  const rows = await db.collectorReport.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { id: true },
  })

  const results: CollectorPickupSettlementReconciliation[] = []
  for (const row of rows) {
    results.push(await getCollectorPickupSettlementStatus(db, row.id))
  }
  return results
}
