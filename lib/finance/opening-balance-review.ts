import type { PrismaClient } from "@/generated/prisma/client"
import { parseDocumentEntityCode } from "@/lib/legal-entity/document-entity"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { addMoney, toMoney, ZERO } from "./decimal"
import { FinancePostingError } from "./posting-errors"
import { isOpeningBalancePeriodKey } from "./opening-balance-period"
import type {
  OpeningBalanceReviewItem,
  OpeningBalanceReviewJournalRef,
  OpeningBalanceReviewResult,
  OpeningBalanceReviewStatus,
} from "./opening-balance-review-types"
import { getTrialBalance } from "./reports/trial-balance"
import { periodKeyToReportDateRange } from "./reports/report-filter"

export type OpeningBalanceReviewPrisma = Pick<
  PrismaClient,
  "accountingPeriod" | "manualJournalEntry" | "glAccount" | "journalEntryLine"
>

function reviewItem(
  id: OpeningBalanceReviewItem["id"],
  passed: boolean,
  title: string,
  detail: string
): OpeningBalanceReviewItem {
  return { id, passed, title, detail }
}

function resolveStatus(items: OpeningBalanceReviewItem[]): OpeningBalanceReviewStatus {
  return items.every((item) => item.passed) ? "READY" : "BLOCKED"
}

function emptyJournalRef(): OpeningBalanceReviewJournalRef {
  return {
    id: null,
    entryNo: null,
    status: null,
    postedAt: null,
    postedJournalEntryId: null,
    postedVoucherId: null,
    voucherNo: null,
  }
}

export async function buildOpeningBalanceReviewForPeriod(
  prisma: OpeningBalanceReviewPrisma,
  periodId: string
): Promise<OpeningBalanceReviewResult> {
  const trimmedId = periodId.trim()
  if (!trimmedId) {
    throw new FinancePostingError(
      "Accounting period id is required",
      "PERIOD_NOT_FOUND"
    )
  }

  const period = await prisma.accountingPeriod.findUnique({
    where: { id: trimmedId },
  })

  if (!period) {
    throw new FinancePostingError(
      `Accounting period not found: ${trimmedId}`,
      "PERIOD_NOT_FOUND"
    )
  }

  if (!isOpeningBalancePeriodKey(period.periodKey)) {
    throw new FinancePostingError(
      `Period ${period.periodKey} is not an opening balance period`,
      "VALIDATION_ERROR"
    )
  }

  const legalEntityCode = parseDocumentEntityCode(period.legalEntityCode)
  if (!legalEntityCode) {
    throw new FinancePostingError(
      `Invalid legal entity on period ${period.periodKey}`,
      "VALIDATION_ERROR"
    )
  }

  const { from, to } = periodKeyToReportDateRange(period.periodKey)

  const openingJournalRow = await prisma.manualJournalEntry.findFirst({
    where: {
      legalEntityCode: period.legalEntityCode,
      entryType: "OPENING_BALANCE",
      entryDate: {
        gte: new Date(`${from}T00:00:00.000Z`),
        lte: new Date(`${to}T23:59:59.999Z`),
      },
    },
    orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
    include: {
      lines: true,
      postedVoucher: { select: { voucherNo: true } },
    },
  })

  const chartOfAccountsCount = await prisma.glAccount.count({
    where: { deleted: false, isActive: true },
  })

  let trialBalanceBalanced: boolean | null = null
  let trialBalanceTotalDebit: string | null = null
  let trialBalanceTotalCredit: string | null = null

  if (openingJournalRow?.status === "POSTED") {
    const trialBalance = await getTrialBalance(prisma, {
      legalEntityCode,
      periodKey: period.periodKey,
    })
    trialBalanceBalanced = trialBalance.isBalanced
    trialBalanceTotalDebit = trialBalance.totalDebits
    trialBalanceTotalCredit = trialBalance.totalCredits
  }

  let entryTotalDebit = ZERO
  let entryTotalCredit = ZERO
  if (openingJournalRow) {
    for (const line of openingJournalRow.lines) {
      entryTotalDebit = addMoney(entryTotalDebit, toMoney(line.debit))
      entryTotalCredit = addMoney(entryTotalCredit, toMoney(line.credit))
    }
  }

  const debitEqualsCredit =
    openingJournalRow != null && entryTotalDebit.equals(entryTotalCredit)

  const openingJournal: OpeningBalanceReviewJournalRef = openingJournalRow
    ? {
        id: openingJournalRow.id,
        entryNo: openingJournalRow.entryNo,
        status: openingJournalRow.status,
        postedAt: openingJournalRow.postedAt?.toISOString() ?? null,
        postedJournalEntryId: openingJournalRow.postedJournalEntryId,
        postedVoucherId: openingJournalRow.postedVoucherId,
        voucherNo: openingJournalRow.postedVoucher?.voucherNo ?? null,
      }
    : emptyJournalRef()

  const items: OpeningBalanceReviewItem[] = [
    reviewItem(
      "accounting-period-exists",
      true,
      "Accounting period exists",
      `Period ${period.periodKey} is registered for ${period.legalEntityCode}.`
    ),
    reviewItem(
      "ob-journal-exists",
      openingJournalRow != null,
      "Opening Balance journal exists",
      openingJournalRow
        ? `Journal ${openingJournalRow.entryNo} is linked to this period.`
        : "No OPENING_BALANCE journal was found for this period."
    ),
    reviewItem(
      "ob-journal-posted",
      openingJournalRow?.status === "POSTED",
      "Opening Balance journal is POSTED",
      openingJournalRow
        ? openingJournalRow.status === "POSTED"
          ? `Journal ${openingJournalRow.entryNo} is posted.`
          : `Journal ${openingJournalRow.entryNo} is ${openingJournalRow.status}.`
        : "Post the opening balance journal before locking the period."
    ),
    reviewItem(
      "debit-equals-credit",
      debitEqualsCredit,
      "Debit = Credit",
      openingJournalRow
        ? debitEqualsCredit
          ? `Journal totals match (${entryTotalDebit.toString()} / ${entryTotalCredit.toString()}).`
          : `Journal debits ${entryTotalDebit.toString()} do not equal credits ${entryTotalCredit.toString()}.`
        : "No opening balance journal lines to verify."
    ),
    reviewItem(
      "trial-balance-balanced",
      trialBalanceBalanced === true,
      "Trial Balance is balanced",
      trialBalanceBalanced === true
        ? `Trial balance for ${period.periodKey} is balanced (${trialBalanceTotalDebit} / ${trialBalanceTotalCredit}).`
        : trialBalanceBalanced === false
          ? `Trial balance for ${period.periodKey} is out of balance (${trialBalanceTotalDebit} / ${trialBalanceTotalCredit}).`
          : "Trial balance can be checked after the opening balance journal is posted."
    ),
    reviewItem(
      "chart-of-accounts-available",
      chartOfAccountsCount > 0,
      "Chart of Accounts available",
      chartOfAccountsCount > 0
        ? `${chartOfAccountsCount} active GL accounts are available.`
        : "No active GL accounts were found."
    ),
  ]

  const status = resolveStatus(items)
  const blockerCount = items.filter((item) => !item.passed).length

  return {
    status,
    blockerCount,
    items,
    period: {
      id: period.id,
      legalEntityCode: period.legalEntityCode,
      branchId: period.branchId,
      periodKey: period.periodKey,
      status: period.status,
      closedAt: period.closedAt ? period.closedAt.toISOString() : null,
    },
    openingJournal,
    trialBalance: {
      isBalanced: trialBalanceBalanced,
      totalDebit: trialBalanceTotalDebit,
      totalCredit: trialBalanceTotalCredit,
    },
  }
}

export async function buildOpeningBalanceReviewForPeriodKey(
  prisma: OpeningBalanceReviewPrisma,
  input: { periodKey: string; legalEntityCode: DocumentEntityCode }
): Promise<OpeningBalanceReviewResult> {
  const period = await prisma.accountingPeriod.findUnique({
    where: {
      legalEntityCode_periodKey: {
        legalEntityCode: input.legalEntityCode,
        periodKey: input.periodKey.trim(),
      },
    },
  })

  if (!period) {
    throw new FinancePostingError(
      `Accounting period not found: ${input.periodKey}`,
      "PERIOD_NOT_FOUND"
    )
  }

  return buildOpeningBalanceReviewForPeriod(prisma, period.id)
}
