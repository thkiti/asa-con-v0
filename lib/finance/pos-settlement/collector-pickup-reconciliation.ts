import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import { addMoney, roundMoney, toMoney, ZERO } from "@/lib/finance/decimal"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import type { ReadReportMode, ReadReportPayload } from "@/lib/pos/read-report-types"
import { normalizeDateRange } from "@/lib/reporting/date-range"
import type { BankDepositSettlementStatus } from "./bank-deposit-reconciliation"
import {
  isCollectModeCollectorReport,
  parseCollectorReportPayload,
} from "./collector-report-source"
import {
  buildPayInEvidenceSummary,
  getPayInEvidenceByCollectorReportId,
  type PayInEvidenceSummary,
} from "./pay-in-evidence"
import { resolveColPayInArchiveContext } from "./pay-in-evidence-vault"
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
  /** Bank deposit (PAY-IN) side */
  depositStatus: BankDepositSettlementStatus
  inTransitAmount: string
  bankDepositVoucherId: string | null
  bankDepositVoucherNo: string | null
  glDebitBank1021: string
  glCreditCashInTransit1031: string
} & PayInEvidenceSummary

export type ListCollectorPickupSettlementStatusesInput = {
  branchId?: string
  from?: Date | string
  to?: Date | string
}

type CollectorPickupReconciliationDb = Pick<
  PrismaClient,
  "collectorReport" | "voucher" | "posPayInEvidence" | "documentArchiveLink" | "documentArchive" | "$transaction"
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
  return parseCollectorReportPayload(reportJson)
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

function sumCollectorPickupInTransitDebit(
  lines: SettlementJournalLine[]
): ReturnType<typeof toMoney> {
  let debitCashInTransit = ZERO
  for (const line of lines) {
    if (line.glAccount.code === DEFAULT_ACCOUNT_CODES.CASH_IN_TRANSIT_COLLECTOR) {
      debitCashInTransit = addMoney(debitCashInTransit, toMoney(line.debit))
    }
  }
  return debitCashInTransit
}

function sumBankDepositJournalAmounts(lines: SettlementJournalLine[]): {
  debitBank: ReturnType<typeof toMoney>
  creditCashInTransit: ReturnType<typeof toMoney>
} {
  let debitBank = ZERO
  let creditCashInTransit = ZERO

  for (const line of lines) {
    const code = line.glAccount.code
    if (code === DEFAULT_ACCOUNT_CODES.BANK) {
      debitBank = addMoney(debitBank, toMoney(line.debit))
    } else if (code === DEFAULT_ACCOUNT_CODES.CASH_IN_TRANSIT_COLLECTOR) {
      creditCashInTransit = addMoney(creditCashInTransit, toMoney(line.credit))
    }
  }

  return { debitBank, creditCashInTransit }
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

function bankDepositSettlementVariance(
  expected: ReturnType<typeof toMoney>,
  debitBank: ReturnType<typeof toMoney>,
  creditCashInTransit: ReturnType<typeof toMoney>
): ReturnType<typeof toMoney> {
  const exp = roundMoney(expected)
  const debitGap = roundMoney(exp.minus(debitBank).abs())
  const creditGap = roundMoney(exp.minus(creditCashInTransit).abs())
  const internalGap = roundMoney(debitBank.minus(creditCashInTransit).abs())

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

function resolvePickupSettlementStatus(input: {
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

function resolveDepositSettlementStatus(input: {
  isValidSource: boolean
  pickupPosted: boolean
  inTransitAmount: ReturnType<typeof toMoney>
  voucher: LinkedSettlementVoucher
  debitBank: ReturnType<typeof toMoney>
  creditCashInTransit: ReturnType<typeof toMoney>
}): BankDepositSettlementStatus {
  if (!input.isValidSource) {
    return "INVALID_SOURCE"
  }

  if (!input.pickupPosted) {
    return "NOT_ELIGIBLE"
  }

  const expected = roundMoney(input.inTransitAmount)
  const debit = roundMoney(input.debitBank)
  const credit = roundMoney(input.creditCashInTransit)
  const hasPostedJournal =
    input.voucher?.journalEntry != null && input.voucher.journalEntry.lines.length > 0

  if (!input.voucher || !hasPostedJournal) {
    return "NOT_POSTED"
  }

  if (
    expected.gt(ZERO) &&
    debit.equals(expected) &&
    credit.equals(expected) &&
    debit.equals(credit)
  ) {
    return "POSTED"
  }

  return "VARIANCE"
}

function buildCollectorPickupSettlementReconciliation(
  source: CollectorReportRow,
  report: ReadReportPayload | null,
  pickupVoucher: LinkedSettlementVoucher,
  depositVoucher: LinkedSettlementVoucher,
  evidenceSummary: PayInEvidenceSummary
): CollectorPickupSettlementReconciliation {
  const { mode, expectedAmount, isValidSource } = deriveExpectedAmount(report)
  const pickupJournalLines = pickupVoucher?.journalEntry?.lines ?? []
  const { debitCashInTransit, creditCashDrawer } =
    sumSettlementJournalAmounts(pickupJournalLines)
  const pickupStatusFields = resolvePickupSettlementStatus({
    isValidSource,
    expectedAmount,
    voucher: pickupVoucher,
    debitCashInTransit,
    creditCashDrawer,
  })

  const pickupPosted =
    pickupVoucher?.journalEntry != null &&
    pickupVoucher.journalEntry.lines.length > 0

  const pickupInTransitDebit = pickupPosted
    ? sumCollectorPickupInTransitDebit(pickupVoucher!.journalEntry!.lines)
    : ZERO

  const inTransitAmount =
    pickupPosted && pickupInTransitDebit.gt(ZERO)
      ? pickupInTransitDebit
      : expectedAmount

  const depositJournalLines = depositVoucher?.journalEntry?.lines ?? []
  const { debitBank, creditCashInTransit } =
    sumBankDepositJournalAmounts(depositJournalLines)

  const depositStatus = resolveDepositSettlementStatus({
    isValidSource,
    pickupPosted,
    inTransitAmount,
    voucher: depositVoucher,
    debitBank,
    creditCashInTransit,
  })

  return {
    collectorReportId: source.id,
    collectNo: source.collectNo,
    mode,
    branchId: source.branchId,
    branchCode: source.branch?.code ?? report?.branchCode ?? null,
    branchName: source.branch?.name ?? report?.branchName ?? null,
    expectedAmount: formatAmount(expectedAmount),
    voucherId: pickupVoucher?.id ?? null,
    voucherNo: pickupVoucher?.voucherNo ?? null,
    glDebitCashInTransit1031: formatAmount(debitCashInTransit),
    glCreditCashDrawer1001: formatAmount(creditCashDrawer),
    postedAmountEquivalent: pickupStatusFields.postedAmountEquivalent,
    variance: pickupStatusFields.variance,
    status: pickupStatusFields.status,
    depositStatus,
    inTransitAmount: formatAmount(inTransitAmount),
    bankDepositVoucherId: depositVoucher?.id ?? null,
    bankDepositVoucherNo: depositVoucher?.voucherNo ?? null,
    glDebitBank1021: formatAmount(debitBank),
    glCreditCashInTransit1031: formatAmount(creditCashInTransit),
    ...evidenceSummary,
  }
}

async function loadLinkedSettlementVoucher(
  db: CollectorPickupReconciliationDb,
  refType: string,
  collectorReportId: string
): Promise<LinkedSettlementVoucher> {
  return db.voucher.findUnique({
    where: {
      refType_refId: {
        refType,
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
  const pickupVoucher = await loadLinkedSettlementVoucher(
    db,
    FINANCE_REF_TYPES.POS_SETTLEMENT_COLLECTOR_PICKUP,
    source.id
  )
  const depositVoucher = await loadLinkedSettlementVoucher(
    db,
    FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT,
    source.id
  )
  const evidence = await getPayInEvidenceByCollectorReportId(db, source.id)
  const depositPosted =
    depositVoucher?.journalEntry != null &&
    depositVoucher.journalEntry.lines.length > 0

  const { expectedAmount, isValidSource } = deriveExpectedAmount(report)
  const pickupJournalLines = pickupVoucher?.journalEntry?.lines ?? []
  const { debitCashInTransit, creditCashDrawer } =
    sumSettlementJournalAmounts(pickupJournalLines)
  const pickupStatusFields = resolvePickupSettlementStatus({
    isValidSource,
    expectedAmount,
    voucher: pickupVoucher,
    debitCashInTransit,
    creditCashDrawer,
  })

  const pickupPosted =
    pickupVoucher?.journalEntry != null &&
    pickupVoucher.journalEntry.lines.length > 0
  const pickupInTransitDebit = pickupPosted
    ? sumCollectorPickupInTransitDebit(pickupVoucher!.journalEntry!.lines)
    : ZERO
  const inTransitAmount =
    pickupPosted && pickupInTransitDebit.gt(ZERO)
      ? pickupInTransitDebit
      : expectedAmount

  const depositJournalLines = depositVoucher?.journalEntry?.lines ?? []
  const { debitBank, creditCashInTransit } =
    sumBankDepositJournalAmounts(depositJournalLines)
  const depositStatus = resolveDepositSettlementStatus({
    isValidSource,
    pickupPosted,
    inTransitAmount,
    voucher: depositVoucher,
    debitBank,
    creditCashInTransit,
  })

  const archiveContext = await resolveColPayInArchiveContext(db, {
    collectorReportId: source.id,
    collectNo: source.collectNo,
    pickupStatus: pickupStatusFields.status,
    depositStatus,
  })

  const evidenceSummary = buildPayInEvidenceSummary({
    evidence,
    depositPosted,
    archiveAvailable: archiveContext.archiveAvailable,
    collectorReportId: source.id,
  })

  return buildCollectorPickupSettlementReconciliation(
    source,
    report,
    pickupVoucher,
    depositVoucher,
    evidenceSummary
  )
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
    select: { id: true, reportJson: true },
  })

  const results: CollectorPickupSettlementReconciliation[] = []
  for (const row of rows) {
    if (!isCollectModeCollectorReport(row.reportJson)) {
      continue
    }
    results.push(await getCollectorPickupSettlementStatus(db, row.id))
  }
  return results
}

// Keep bank deposit variance helper exported for tests if needed
export { bankDepositSettlementVariance }
