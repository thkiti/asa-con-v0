import type { Prisma } from "@/generated/prisma/client"
import {
  AccountingPeriodStatus,
  type PrismaClient,
} from "@/generated/prisma/client"
import { buildClosingEntryLines } from "./closing-entry"
import type {
  PostClosingEntryResult,
  PreviewClosingEntryResult,
} from "./closing-entry-types"
import {
  allocateClosingEntryRefId,
  getActiveClosingEntry,
  listClosingEntriesForPeriod,
  type ClosingEntryStatusPrisma,
} from "./closing-entry-status"
import { ZERO } from "./decimal"
import { FinancePostingError } from "./posting-errors"
import { postClosingEntryVoucher } from "./posting"
import type { ManualJournalLineInput } from "./posting-types"
import { parseDocumentEntityCode } from "@/lib/legal-entity/document-entity"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { periodKeyToReportDateRange } from "./reports/report-filter"
import { getProfitLoss } from "./reports/profit-loss"

export type PostClosingEntryInput = {
  periodId: string
  periodKey: string
}

export type ClosingEntryPreviewPrisma = Pick<
  PrismaClient,
  | "accountingPeriod"
  | "glAccount"
  | "journalEntryLine"
  | "voucher"
  | "journalEntry"
> &
  ClosingEntryStatusPrisma

export type PreviewClosingEntryInput = {
  periodId: string
  periodKey: string
}

function resolvePeriodEntityCode(legalEntityCode: string): DocumentEntityCode {
  const code = parseDocumentEntityCode(legalEntityCode)
  if (!code) {
    throw new FinancePostingError("Invalid legal entity on accounting period", "VALIDATION_ERROR")
  }
  return code
}

function mapSimulationToJournalLines(
  simulation: ReturnType<typeof buildClosingEntryLines>
): ManualJournalLineInput[] {
  return simulation.lines.map((line) => ({
    accountCode: line.accountCode,
    debit: line.debit,
    credit: line.credit,
    memo: line.reason,
  }))
}

function assertPeriodScope(
  period: { id: string; periodKey: string },
  input: { periodId: string; periodKey: string }
): void {
  if (period.id !== input.periodId || period.periodKey !== input.periodKey) {
    throw new FinancePostingError(
      "Closing entry period scope mismatch",
      "VALIDATION_ERROR"
    )
  }
}

export async function previewClosingEntry(
  prisma: ClosingEntryPreviewPrisma,
  input: PreviewClosingEntryInput
): Promise<PreviewClosingEntryResult> {
  const period = await prisma.accountingPeriod.findUnique({
    where: { id: input.periodId },
  })

  if (!period) {
    throw new FinancePostingError(
      `Accounting period not found: ${input.periodId}`,
      "PERIOD_NOT_FOUND"
    )
  }

  assertPeriodScope(period, input)

  const profitLoss = await getProfitLoss(prisma, {
    legalEntityCode: resolvePeriodEntityCode(period.legalEntityCode),
    periodKey: input.periodKey,
  })

  const simulation = buildClosingEntryLines({
    periodKey: input.periodKey,
    revenue: profitLoss.revenue.map((row) => ({
      accountCode: row.accountCode,
      accountName: row.accountName,
      signedAmount: row.amount,
    })),
    expenses: profitLoss.expenses.map((row) => ({
      accountCode: row.accountCode,
      accountName: row.accountName,
      signedAmount: row.amount,
    })),
  })

  const activeEntry = await getActiveClosingEntry(prisma, input.periodId)

  return {
    periodKey: input.periodKey,
    branchId: period.branchId,
    periodId: input.periodId,
    periodStatus: period.status,
    simulation,
    activeEntry,
    canPost:
      period.status === AccountingPeriodStatus.OPEN &&
      simulation.isRequired &&
      activeEntry == null,
  }
}

export async function postClosingEntry(
  tx: Prisma.TransactionClient,
  input: PostClosingEntryInput
): Promise<PostClosingEntryResult> {
  const period = await tx.accountingPeriod.findUnique({
    where: { id: input.periodId },
  })

  if (!period) {
    throw new FinancePostingError(
      `Accounting period not found: ${input.periodId}`,
      "PERIOD_NOT_FOUND"
    )
  }

  assertPeriodScope(period, input)

  if (period.status !== AccountingPeriodStatus.OPEN) {
    throw new FinancePostingError("period closed", "PERIOD_CLOSED")
  }

  const activeEntry = await getActiveClosingEntry(tx, input.periodId)
  if (activeEntry) {
    return {
      posted: true,
      voucherId: activeEntry.voucherId,
      voucherNo: activeEntry.voucherNo,
      journalEntryId: activeEntry.journalEntryId,
      netIncome: activeEntry.netIncome,
      lineCount: activeEntry.lineCount,
      alreadyPosted: true,
    }
  }

  const profitLoss = await getProfitLoss(tx, {
    legalEntityCode: resolvePeriodEntityCode(period.legalEntityCode),
    periodKey: input.periodKey,
  })

  const simulation = buildClosingEntryLines({
    periodKey: input.periodKey,
    revenue: profitLoss.revenue.map((row) => ({
      accountCode: row.accountCode,
      accountName: row.accountName,
      signedAmount: row.amount,
    })),
    expenses: profitLoss.expenses.map((row) => ({
      accountCode: row.accountCode,
      accountName: row.accountName,
      signedAmount: row.amount,
    })),
  })

  if (!simulation.isRequired) {
    return {
      posted: false,
      reason: "NOT_REQUIRED",
      netIncome: ZERO.toString(),
      lineCount: 0,
      alreadyPosted: false,
    }
  }

  if (!simulation.isBalanced) {
    throw new FinancePostingError(
      "Closing entry simulation is not balanced",
      "UNBALANCED_CLOSING_ENTRY"
    )
  }

  const existingEntries = await listClosingEntriesForPeriod(tx, input.periodId)
  const refId = allocateClosingEntryRefId(input.periodId, existingEntries)
  const { to: periodEndDate } = periodKeyToReportDateRange(input.periodKey)
  const postingDate = new Date(`${periodEndDate}T12:00:00.000Z`)
  const lines = mapSimulationToJournalLines(simulation)

  const posted = await postClosingEntryVoucher({
    tx,
    branchId: period.branchId,
    periodId: input.periodId,
    periodKey: input.periodKey,
    date: postingDate,
    refId,
    description: `Period closing entry ${input.periodKey}`,
    lines,
    legalEntityCode: resolvePeriodEntityCode(period.legalEntityCode),
  })

  return {
    posted: true,
    voucherId: posted.voucherId,
    voucherNo: posted.voucherNo,
    journalEntryId: posted.journalEntryId,
    netIncome: simulation.netIncome,
    lineCount: simulation.lines.length,
    alreadyPosted: posted.alreadyPosted,
  }
}
