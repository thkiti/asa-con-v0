import type { AccountingPeriodStatus, PrismaClient } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { parseDocumentEntityCode } from "@/lib/legal-entity/document-entity"
import { buildClosingEntryLines } from "./closing-entry"
import { getActiveClosingEntry } from "./closing-entry-status"
import { buildCloseChecklist, toCloseChecklistSnapshotRef } from "./close-checklist"
import type { CloseChecklistClosingEntryContext } from "./close-checklist-types"
import { getProfitLoss } from "./reports/profit-loss"
import type {
  CloseChecklistResult,
  CloseChecklistSnapshotRef,
} from "./close-checklist-types"
import { FinancePostingError } from "./posting-errors"
import { findSnapshotsForPeriod } from "./reconciliation-snapshot"
import type { ReconciliationSnapshotPayloadV1 } from "./reconciliation-snapshot-types"
import type { BranchLookupPrisma } from "./resolve-branch-id"

export type CloseReadinessPrisma = CloseReadinessChecklistPrisma

export type CloseReadinessChecklistPrisma = Pick<
  PrismaClient,
  "reconciliationSnapshot" | "glAccount" | "journalEntryLine" | "accountingPeriod" | "voucher" | "journalEntry"
> &
  BranchLookupPrisma

export type CloseReadinessPeriodInput = {
  id: string
  branchId: string
  legalEntityCode: string
  periodKey: string
  status: AccountingPeriodStatus
  closedAt: Date | null
}

function resolvePeriodEntityCode(period: CloseReadinessPeriodInput): DocumentEntityCode {
  const code = parseDocumentEntityCode(period.legalEntityCode)
  if (!code) {
    throw new FinancePostingError(
      `Invalid legal entity on period ${period.periodKey}`,
      "VALIDATION_ERROR"
    )
  }
  return code
}

export type CloseReadinessResult = CloseChecklistResult & {
  priorSnapshotRef: CloseChecklistSnapshotRef | null
}

export type CloseReadinessWithSnapshots = {
  checklist: CloseChecklistResult
  priorSnapshotRef: CloseChecklistSnapshotRef | null
  snapshotPayload: ReconciliationSnapshotPayloadV1 | null
}

async function loadClosingEntryChecklistContext(
  prisma: CloseReadinessChecklistPrisma,
  period: CloseReadinessPeriodInput
): Promise<CloseChecklistClosingEntryContext> {
  const profitLoss = await getProfitLoss(prisma, {
    legalEntityCode: resolvePeriodEntityCode(period),
    periodKey: period.periodKey,
  })

  const simulation = buildClosingEntryLines({
    periodKey: period.periodKey,
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

  const activeEntry = await getActiveClosingEntry(prisma, period.id)

  return {
    isRequired: simulation.isRequired,
    currentNetIncome: profitLoss.netIncome,
    activeEntry: activeEntry
      ? { netIncome: activeEntry.netIncome }
      : null,
  }
}

export async function buildCloseReadinessWithSnapshotsForPeriod(
  prisma: CloseReadinessChecklistPrisma,
  period: CloseReadinessPeriodInput
): Promise<CloseReadinessWithSnapshots> {
  const snapshots = await findSnapshotsForPeriod(prisma, {
    periodKey: period.periodKey,
  })

  const closingEntry = await loadClosingEntryChecklistContext(prisma, period)

  const checklist = buildCloseChecklist({
    period: {
      id: period.id,
      legalEntityCode: period.legalEntityCode,
      branchId: period.branchId,
      periodKey: period.periodKey,
      status: period.status,
      closedAt: period.closedAt ? period.closedAt.toISOString() : null,
    },
    latestSnapshot: snapshots.latest,
    priorSnapshot: snapshots.prior,
    snapshotPayload: snapshots.latest?.payload ?? null,
    closingEntry,
  })

  return {
    checklist,
    priorSnapshotRef: snapshots.prior
      ? toCloseChecklistSnapshotRef(snapshots.prior)
      : null,
    snapshotPayload: snapshots.latest?.payload ?? null,
  }
}

export async function buildCloseReadinessChecklistForPeriod(
  prisma: CloseReadinessChecklistPrisma,
  period: CloseReadinessPeriodInput
): Promise<CloseChecklistResult> {
  const { checklist } = await buildCloseReadinessWithSnapshotsForPeriod(prisma, period)
  return checklist
}

export async function getCloseReadinessByPeriodId(
  prisma: CloseReadinessPrisma,
  periodId: string
): Promise<CloseReadinessResult> {
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

  const snapshots = await findSnapshotsForPeriod(prisma, {
    periodKey: period.periodKey,
  })

  const checklist = await buildCloseReadinessChecklistForPeriod(prisma, period)

  return {
    ...checklist,
    priorSnapshotRef: snapshots.prior
      ? toCloseChecklistSnapshotRef(snapshots.prior)
      : null,
  }
}
