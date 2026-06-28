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

export type BankDepositSettlementStatus =
  | "NOT_POSTED"
  | "POSTED"
  | "VARIANCE"
  | "INVALID_SOURCE"
  | "NOT_ELIGIBLE"

export type BankDepositSettlementReconciliation = {
  collectorReportId: string
  collectNo: string
  mode: ReadReportMode | null
  branchId: string
  branchCode: string | null
  branchName: string | null
  inTransitAmount: string
  collectorPickupVoucherId: string | null
  collectorPickupVoucherNo: string | null
  voucherId: string | null
  voucherNo: string | null
  glDebitBank1021: string
  glCreditCashInTransit1031: string
  postedAmountEquivalent: string
  variance: string
  status: BankDepositSettlementStatus
}

export type ListBankDepositSettlementStatusesInput = {
  branchId?: string
  from?: Date | string
  to?: Date | string
}

type BankDepositReconciliationDb = Pick<
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

function deriveInTransitAmount(report: ReadReportPayload | null): {
  mode: ReadReportMode | null
  inTransitAmount: ReturnType<typeof toMoney>
  isValidSource: boolean
} {
  if (!report) {
    return { mode: null, inTransitAmount: ZERO, isValidSource: false }
  }

  const inTransitAmount = toMoney(report.grandTotal)
  const isValidSource = report.mode === "COLLECT" && inTransitAmount.gt(ZERO)

  return {
    mode: report.mode,
    inTransitAmount,
    isValidSource,
  }
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

function settlementVariance(
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

function resolveSettlementStatus(input: {
  isValidSource: boolean
  pickupPosted: boolean
  inTransitAmount: ReturnType<typeof toMoney>
  voucher: LinkedSettlementVoucher
  debitBank: ReturnType<typeof toMoney>
  creditCashInTransit: ReturnType<typeof toMoney>
}): Pick<
  BankDepositSettlementReconciliation,
  "status" | "postedAmountEquivalent" | "variance"
> {
  if (!input.isValidSource) {
    return {
      status: "INVALID_SOURCE",
      postedAmountEquivalent: "0.00",
      variance: "0.00",
    }
  }

  if (!input.pickupPosted) {
    return {
      status: "NOT_ELIGIBLE",
      postedAmountEquivalent: "0.00",
      variance: formatAmount(input.inTransitAmount),
    }
  }

  const expected = roundMoney(input.inTransitAmount)
  const debit = roundMoney(input.debitBank)
  const credit = roundMoney(input.creditCashInTransit)
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
    variance: formatAmount(settlementVariance(expected, debit, credit)),
  }
}

function buildBankDepositSettlementReconciliation(
  source: CollectorReportRow,
  report: ReadReportPayload | null,
  pickupVoucher: LinkedSettlementVoucher,
  depositVoucher: LinkedSettlementVoucher
): BankDepositSettlementReconciliation {
  const { mode, inTransitAmount, isValidSource } = deriveInTransitAmount(report)
  const pickupPosted =
    pickupVoucher?.journalEntry != null &&
    pickupVoucher.journalEntry.lines.length > 0

  const pickupInTransitDebit = pickupPosted
    ? sumCollectorPickupInTransitDebit(pickupVoucher!.journalEntry!.lines)
    : ZERO

  const expectedAmount =
    pickupPosted && pickupInTransitDebit.gt(ZERO)
      ? pickupInTransitDebit
      : inTransitAmount

  const journalLines = depositVoucher?.journalEntry?.lines ?? []
  const { debitBank, creditCashInTransit } =
    sumBankDepositJournalAmounts(journalLines)
  const statusFields = resolveSettlementStatus({
    isValidSource,
    pickupPosted,
    inTransitAmount: expectedAmount,
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
    inTransitAmount: formatAmount(expectedAmount),
    collectorPickupVoucherId: pickupVoucher?.id ?? null,
    collectorPickupVoucherNo: pickupVoucher?.voucherNo ?? null,
    voucherId: depositVoucher?.id ?? null,
    voucherNo: depositVoucher?.voucherNo ?? null,
    glDebitBank1021: formatAmount(debitBank),
    glCreditCashInTransit1031: formatAmount(creditCashInTransit),
    postedAmountEquivalent: statusFields.postedAmountEquivalent,
    variance: statusFields.variance,
    status: statusFields.status,
  }
}

async function loadLinkedSettlementVoucher(
  db: BankDepositReconciliationDb,
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

export async function getBankDepositSettlementStatus(
  db: BankDepositReconciliationDb,
  collectorReportId: string
): Promise<BankDepositSettlementReconciliation> {
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

  return buildBankDepositSettlementReconciliation(
    source,
    report,
    pickupVoucher,
    depositVoucher
  )
}

export async function listBankDepositSettlementStatuses(
  db: BankDepositReconciliationDb,
  input: ListBankDepositSettlementStatusesInput = {}
): Promise<BankDepositSettlementReconciliation[]> {
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

  const results: BankDepositSettlementReconciliation[] = []
  for (const row of rows) {
    results.push(await getBankDepositSettlementStatus(db, row.id))
  }
  return results
}
