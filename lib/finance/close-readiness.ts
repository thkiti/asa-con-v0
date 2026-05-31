import type { AccountingPeriodStatus, PrismaClient } from "@/generated/prisma/client"
import { buildCloseChecklist, toCloseChecklistSnapshotRef } from "./close-checklist"
import type {
  CloseChecklistResult,
  CloseChecklistSnapshotRef,
} from "./close-checklist-types"
import { FinancePostingError } from "./posting-errors"
import { findSnapshotsForPeriod } from "./reconciliation-snapshot"
import type { ReconciliationSnapshotPayloadV1 } from "./reconciliation-snapshot-types"
import type { BranchLookupPrisma } from "./resolve-branch-id"

export type CloseReadinessPrisma = Pick<
  PrismaClient,
  "accountingPeriod" | "reconciliationSnapshot"
> &
  BranchLookupPrisma

export type CloseReadinessChecklistPrisma = Pick<
  PrismaClient,
  "reconciliationSnapshot"
> &
  BranchLookupPrisma

export type CloseReadinessPeriodInput = {
  id: string
  branchId: string
  periodKey: string
  status: AccountingPeriodStatus
  closedAt: Date | null
}

export type CloseReadinessResult = CloseChecklistResult & {
  priorSnapshotRef: CloseChecklistSnapshotRef | null
}

export type CloseReadinessWithSnapshots = {
  checklist: CloseChecklistResult
  priorSnapshotRef: CloseChecklistSnapshotRef | null
  snapshotPayload: ReconciliationSnapshotPayloadV1 | null
}

export async function buildCloseReadinessWithSnapshotsForPeriod(
  prisma: CloseReadinessChecklistPrisma,
  period: CloseReadinessPeriodInput
): Promise<CloseReadinessWithSnapshots> {
  const snapshots = await findSnapshotsForPeriod(prisma, {
    branchId: period.branchId,
    periodKey: period.periodKey,
  })

  const checklist = buildCloseChecklist({
    period: {
      id: period.id,
      branchId: period.branchId,
      periodKey: period.periodKey,
      status: period.status,
      closedAt: period.closedAt ? period.closedAt.toISOString() : null,
    },
    latestSnapshot: snapshots.latest,
    priorSnapshot: snapshots.prior,
    snapshotPayload: snapshots.latest?.payload ?? null,
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
    branchId: period.branchId,
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
