import type { Prisma } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { buildOpeningBalanceReviewForPeriod } from "@/lib/finance/opening-balance-review"
import { periodKeyToReportDateRange } from "@/lib/finance/reports/report-filter"
import { prisma } from "@/lib/shared/prisma"

export const AD_OPENING_BALANCE_RECLASSIFY_TARGET = {
  entryNo: "MJV-260001",
  legalEntityCode: "AD",
  targetPeriodKey: "2025-12",
  targetEntryDate: new Date("2025-12-31T00:00:00.000Z"),
} as const satisfies {
  entryNo: string
  legalEntityCode: DocumentEntityCode
  targetPeriodKey: string
  targetEntryDate: Date
}

export const AD_OPENING_BALANCE_RECLASSIFY_CONFIRM_TOKEN =
  "AD_OPB_RECLASSIFY_CONFIRMED"

export class ReclassifyAdOpeningBalanceError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = "ReclassifyAdOpeningBalanceError"
    this.code = code
  }
}

export type ReclassifyAdOpeningBalanceSnapshot = {
  manualJournalId: string
  documentNo: string
  entryType: string
  status: string
  entryDate: string
  periodKey: string
  periodId: string
  description: string | null
  voucher: {
    id: string
    voucherNo: string
    refType: string
    refId: string
    refNo: string | null
    date: string
    periodId: string
  }
  journalEntry: {
    id: string
    date: string
    lineCount: number
    totalDebit: string
    totalCredit: string
  }
}

export type ReclassifyAdOpeningBalancePlan = {
  before: ReclassifyAdOpeningBalanceSnapshot
  after: ReclassifyAdOpeningBalanceSnapshot
  unchanged: boolean
  accountingPeriodId: string
}

type ReclassifyTargetRow = {
  id: string
  entryNo: string
  entryType: string
  legalEntityCode: string
  status: string
  entryDate: Date
  description: string | null
  postedJournalEntryId: string | null
  postedVoucherId: string | null
  lines: Array<{ debit: Prisma.Decimal; credit: Prisma.Decimal }>
  postedJournalEntry: {
    id: string
    date: Date
    periodId: string
    legalEntityCode: string
    period: { id: string; periodKey: string; legalEntityCode: string }
    _count: { lines: number }
  } | null
  postedVoucher: {
    id: string
    date: Date
    periodId: string
    legalEntityCode: string
    voucherNo: string
    refType: string
    refId: string
    refNo: string | null
    period: { periodKey: string }
  } | null
}

function sumLineTotals(lines: Array<{ debit: Prisma.Decimal; credit: Prisma.Decimal }>) {
  let totalDebit = ZERO
  let totalCredit = ZERO
  for (const line of lines) {
    totalDebit = addMoney(totalDebit, toMoney(line.debit))
    totalCredit = addMoney(totalCredit, toMoney(line.credit))
  }
  return { totalDebit, totalCredit }
}

function assertJournalLinesBalance(
  lines: Array<{ debit: Prisma.Decimal; credit: Prisma.Decimal }>
): void {
  const { totalDebit, totalCredit } = sumLineTotals(lines)
  if (!totalDebit.equals(totalCredit)) {
    throw new ReclassifyAdOpeningBalanceError(
      `Journal lines do not balance (debit ${totalDebit.toString()}, credit ${totalCredit.toString()})`,
      "UNBALANCED_JOURNAL"
    )
  }
}

function buildSnapshot(row: ReclassifyTargetRow): ReclassifyAdOpeningBalanceSnapshot {
  const journal = row.postedJournalEntry!
  const voucher = row.postedVoucher!
  const { totalDebit, totalCredit } = sumLineTotals(row.lines)

  return {
    manualJournalId: row.id,
    documentNo: row.entryNo,
    entryType: row.entryType,
    status: row.status,
    entryDate: row.entryDate.toISOString(),
    periodKey: journal.period.periodKey,
    periodId: journal.periodId,
    description: row.description,
    voucher: {
      id: voucher.id,
      voucherNo: voucher.voucherNo,
      refType: voucher.refType,
      refId: voucher.refId,
      refNo: voucher.refNo,
      date: voucher.date.toISOString(),
      periodId: voucher.periodId,
    },
    journalEntry: {
      id: journal.id,
      date: journal.date.toISOString(),
      lineCount: journal._count.lines,
      totalDebit: totalDebit.toString(),
      totalCredit: totalCredit.toString(),
    },
  }
}

function buildAfterSnapshot(
  before: ReclassifyAdOpeningBalanceSnapshot
): ReclassifyAdOpeningBalanceSnapshot {
  return {
    ...before,
    entryType: "OPENING_BALANCE",
    voucher: {
      ...before.voucher,
      refType: FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL,
    },
  }
}

async function loadReclassifyTarget(
  tx: Prisma.TransactionClient
): Promise<ReclassifyTargetRow> {
  const { entryNo, legalEntityCode } = AD_OPENING_BALANCE_RECLASSIFY_TARGET

  const matches = await tx.manualJournalEntry.findMany({
    where: { entryNo, legalEntityCode },
    include: {
      lines: { select: { debit: true, credit: true } },
      postedJournalEntry: {
        include: {
          period: {
            select: { id: true, periodKey: true, legalEntityCode: true },
          },
          _count: { select: { lines: true } },
        },
      },
      postedVoucher: {
        select: {
          id: true,
          date: true,
          periodId: true,
          legalEntityCode: true,
          voucherNo: true,
          refType: true,
          refId: true,
          refNo: true,
          period: { select: { periodKey: true } },
        },
      },
    },
  })

  if (matches.length === 0) {
    throw new ReclassifyAdOpeningBalanceError(
      `No manual journal entry found for ${legalEntityCode} / ${entryNo}`,
      "NOT_FOUND"
    )
  }
  if (matches.length > 1) {
    throw new ReclassifyAdOpeningBalanceError(
      `Multiple manual journal entries found for ${legalEntityCode} / ${entryNo}`,
      "AMBIGUOUS_TARGET"
    )
  }

  const entry = matches[0]!

  if (entry.legalEntityCode !== legalEntityCode) {
    throw new ReclassifyAdOpeningBalanceError(
      `Target voucher is not ${legalEntityCode}`,
      "WRONG_LEGAL_ENTITY"
    )
  }

  if (entry.status !== "POSTED") {
    throw new ReclassifyAdOpeningBalanceError(
      `Target voucher must be POSTED (current: ${entry.status})`,
      "NOT_POSTED"
    )
  }

  if (!entry.postedJournalEntryId || !entry.postedVoucherId) {
    throw new ReclassifyAdOpeningBalanceError(
      "Target voucher is missing posted journal or voucher linkage",
      "MISSING_POSTED_LINKS"
    )
  }

  if (!entry.postedJournalEntry || !entry.postedVoucher) {
    throw new ReclassifyAdOpeningBalanceError(
      "Posted journal entry or voucher row is missing",
      "MISSING_POSTED_ROWS"
    )
  }

  assertJournalLinesBalance(entry.lines)

  const { targetPeriodKey, targetEntryDate } = AD_OPENING_BALANCE_RECLASSIFY_TARGET
  const journalPeriodKey = entry.postedJournalEntry.period.periodKey

  if (journalPeriodKey !== targetPeriodKey) {
    throw new ReclassifyAdOpeningBalanceError(
      `Posted journal period must be ${targetPeriodKey} (current: ${journalPeriodKey})`,
      "WRONG_PERIOD"
    )
  }

  if (journalPeriodKey >= "2026-01") {
    throw new ReclassifyAdOpeningBalanceError(
      `Refusing to reclassify a journal in ${journalPeriodKey} — only ${targetPeriodKey} is allowed`,
      "LATER_PERIOD_BLOCKED"
    )
  }

  if (entry.entryDate.getTime() !== targetEntryDate.getTime()) {
    throw new ReclassifyAdOpeningBalanceError(
      `Entry date must be ${targetEntryDate.toISOString().slice(0, 10)} (current: ${entry.entryDate.toISOString().slice(0, 10)})`,
      "WRONG_ENTRY_DATE"
    )
  }

  const allowedEntryTypes = new Set(["MANUAL", "OPENING_BALANCE"])
  if (!allowedEntryTypes.has(entry.entryType)) {
    throw new ReclassifyAdOpeningBalanceError(
      `Entry type must be MANUAL or OPENING_BALANCE (current: ${entry.entryType})`,
      "WRONG_ENTRY_TYPE"
    )
  }

  const allowedVoucherRefTypes: string[] = [
    FINANCE_REF_TYPES.MANUAL_JOURNAL,
    FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL,
  ]
  if (!allowedVoucherRefTypes.includes(entry.postedVoucher.refType)) {
    throw new ReclassifyAdOpeningBalanceError(
      `Voucher refType must be MANUAL_JOURNAL or OPENING_BALANCE_JOURNAL (current: ${entry.postedVoucher.refType})`,
      "WRONG_VOUCHER_REF_TYPE"
    )
  }

  if (
    entry.entryType === "OPENING_BALANCE" &&
    entry.postedVoucher.refType === FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL
  ) {
    return entry
  }

  const { from, to } = periodKeyToReportDateRange(targetPeriodKey)
  const duplicate = await tx.manualJournalEntry.findFirst({
    where: {
      id: { not: entry.id },
      legalEntityCode: entry.legalEntityCode,
      entryType: "OPENING_BALANCE",
      status: "POSTED",
      entryDate: {
        gte: new Date(`${from}T00:00:00.000Z`),
        lte: new Date(`${to}T23:59:59.999Z`),
      },
    },
    select: { id: true, entryNo: true },
  })

  if (duplicate) {
    throw new ReclassifyAdOpeningBalanceError(
      `Another posted OPENING_BALANCE already exists for ${entry.legalEntityCode} in ${targetPeriodKey} (${duplicate.entryNo})`,
      "DUPLICATE_OPENING_BALANCE"
    )
  }

  const conflictingVoucher = await tx.voucher.findFirst({
    where: {
      refType: FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL,
      refId: entry.id,
      id: { not: entry.postedVoucher.id },
    },
    select: { id: true, voucherNo: true },
  })

  if (conflictingVoucher) {
    throw new ReclassifyAdOpeningBalanceError(
      `Another voucher already uses OPENING_BALANCE_JOURNAL for this entry (${conflictingVoucher.voucherNo})`,
      "VOUCHER_REF_CONFLICT"
    )
  }

  return entry
}

export async function planReclassifyAdOpeningBalanceMjv(
  tx: Prisma.TransactionClient = prisma
): Promise<ReclassifyAdOpeningBalancePlan> {
  const entry = await loadReclassifyTarget(tx)
  const before = buildSnapshot(entry)
  const after = buildAfterSnapshot(before)
  const unchanged =
    before.entryType === after.entryType &&
    before.voucher.refType === after.voucher.refType

  return {
    before,
    after,
    unchanged,
    accountingPeriodId: entry.postedJournalEntry!.period.id,
  }
}

export async function executeReclassifyAdOpeningBalanceMjv(): Promise<ReclassifyAdOpeningBalancePlan> {
  return prisma.$transaction(async (innerTx) => {
    const plan = await planReclassifyAdOpeningBalanceMjv(innerTx)
    if (plan.unchanged) {
      return plan
    }

    await innerTx.manualJournalEntry.update({
      where: { id: plan.before.manualJournalId },
      data: { entryType: "OPENING_BALANCE" },
    })

    await innerTx.voucher.update({
      where: { id: plan.before.voucher.id },
      data: { refType: FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL },
    })

    return planReclassifyAdOpeningBalanceMjv(innerTx)
  })
}

export async function assertOpeningBalanceReviewQueryFindsRow(
  tx: Prisma.TransactionClient,
  input: { legalEntityCode: string; periodKey: string }
): Promise<{ id: string; entryNo: string; status: string }> {
  const { from, to } = periodKeyToReportDateRange(input.periodKey)
  const row = await tx.manualJournalEntry.findFirst({
    where: {
      legalEntityCode: input.legalEntityCode,
      entryType: "OPENING_BALANCE",
      entryDate: {
        gte: new Date(`${from}T00:00:00.000Z`),
        lte: new Date(`${to}T23:59:59.999Z`),
      },
    },
    orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
    select: { id: true, entryNo: true, status: true },
  })

  if (!row) {
    throw new ReclassifyAdOpeningBalanceError(
      "Opening Balance Review query did not find OPENING_BALANCE journal after repair",
      "REVIEW_LOOKUP_FAILED"
    )
  }

  return row
}

export async function verifyOpeningBalanceReviewAfterReclassify(
  tx: Prisma.TransactionClient,
  accountingPeriodId: string
) {
  const lookup = await assertOpeningBalanceReviewQueryFindsRow(tx, {
    legalEntityCode: AD_OPENING_BALANCE_RECLASSIFY_TARGET.legalEntityCode,
    periodKey: AD_OPENING_BALANCE_RECLASSIFY_TARGET.targetPeriodKey,
  })

  const review = await buildOpeningBalanceReviewForPeriod(tx, accountingPeriodId)

  const requiredItemIds = [
    "ob-journal-exists",
    "ob-journal-posted",
    "debit-equals-credit",
    "trial-balance-balanced",
  ] as const

  const failed = requiredItemIds.filter(
    (id) => !review.items.find((item) => item.id === id)?.passed
  )

  if (failed.length > 0) {
    throw new ReclassifyAdOpeningBalanceError(
      `Opening Balance Review checks failed after repair: ${failed.join(", ")}`,
      "REVIEW_CHECKS_FAILED"
    )
  }

  return { lookup, review }
}

export function formatReclassifyAdOpeningBalanceSnapshot(
  snapshot: ReclassifyAdOpeningBalanceSnapshot,
  label: "before" | "after"
): string {
  return [
    `[${label}] AD opening balance reclassify snapshot`,
    `  manualJournalId: ${snapshot.manualJournalId}`,
    `  documentNo: ${snapshot.documentNo}`,
    `  entryType: ${snapshot.entryType}`,
    `  status: ${snapshot.status}`,
    `  entryDate: ${snapshot.entryDate}`,
    `  periodKey: ${snapshot.periodKey}`,
    `  periodId: ${snapshot.periodId}`,
    `  description: ${snapshot.description ?? "(none)"}`,
    `  voucher.id: ${snapshot.voucher.id}`,
    `  voucher.voucherNo: ${snapshot.voucher.voucherNo}`,
    `  voucher.refType: ${snapshot.voucher.refType}`,
    `  voucher.refId: ${snapshot.voucher.refId}`,
    `  voucher.refNo: ${snapshot.voucher.refNo ?? "(none)"}`,
    `  journalEntry.id: ${snapshot.journalEntry.id}`,
    `  journalEntry.date: ${snapshot.journalEntry.date}`,
    `  journalEntry.lineCount: ${snapshot.journalEntry.lineCount}`,
    `  journalEntry.totalDebit: ${snapshot.journalEntry.totalDebit}`,
    `  journalEntry.totalCredit: ${snapshot.journalEntry.totalCredit}`,
  ].join("\n")
}
