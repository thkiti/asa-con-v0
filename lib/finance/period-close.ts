import type { Prisma } from "@/generated/prisma/client"
import { AccountingPeriodStatus } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { assertCloseReadiness } from "./close-gate"
import { getHardCloseGatePolicy } from "./close-gate-policy"
import { createCloseEvidenceForHardClose, type PeriodCloseActorInput } from "./close-evidence"
import { buildCloseReadinessWithSnapshotsForPeriod } from "./close-readiness"
import { createReopenEvidence } from "./reopen-evidence"
import type { ReopenEvidenceApprovalSnapshot } from "./reopen-evidence-types"
import { getActiveClosingEntry } from "./closing-entry-status"
import { FinancePostingError } from "./posting-errors"
import { accountingPeriodUniqueWhere, resolvePeriodLegalEntityCode } from "./period-lookup"

type PeriodCloseInput = {
  periodKey: string
  legalEntityCode?: DocumentEntityCode | null
  mode: "SOFT" | "HARD"
  closedBy?: PeriodCloseActorInput
}

type PeriodReopenInput = {
  periodKey: string
  legalEntityCode?: DocumentEntityCode | null
  reason: string
  reopenedBy: PeriodCloseActorInput
  reopenRequestId?: string | null
  approval?: ReopenEvidenceApprovalSnapshot | null
}

async function findAccountingPeriod(
  tx: Prisma.TransactionClient,
  input: { periodKey: string; legalEntityCode?: DocumentEntityCode | null }
): Promise<NonNullable<Awaited<ReturnType<typeof tx.accountingPeriod.findUnique>>>> {
  const legalEntityCode = resolvePeriodLegalEntityCode(input.legalEntityCode)
  const period = await tx.accountingPeriod.findUnique({
    where: accountingPeriodUniqueWhere({
      periodKey: input.periodKey,
      legalEntityCode,
    }),
  })

  if (!period) {
    throw new FinancePostingError(
      `Accounting period ${input.periodKey} not found`,
      "PERIOD_NOT_FOUND"
    )
  }

  return period
}

function requireHardCloseActor(closedBy: PeriodCloseActorInput | undefined): PeriodCloseActorInput {
  if (!closedBy?.staffId?.trim()) {
    throw new FinancePostingError(
      "closedBy.staffId is required for HARD close",
      "VALIDATION_ERROR"
    )
  }
  return closedBy
}

function requireReopenActor(reopenedBy: PeriodCloseActorInput | undefined): PeriodCloseActorInput {
  if (!reopenedBy?.staffId?.trim()) {
    throw new FinancePostingError(
      "reopenedBy.staffId is required for reopen",
      "VALIDATION_ERROR"
    )
  }
  return reopenedBy
}

function requireReopenReason(reason: string | undefined): string {
  const trimmed = reason?.trim() ?? ""
  if (!trimmed) {
    throw new FinancePostingError(
      "reason is required for period reopen",
      "VALIDATION_ERROR"
    )
  }
  return trimmed
}

export async function closeAccountingPeriod(
  tx: Prisma.TransactionClient,
  input: PeriodCloseInput
): Promise<NonNullable<Awaited<ReturnType<typeof tx.accountingPeriod.findUnique>>>> {
  const period = await findAccountingPeriod(tx, input)

  if (input.mode === "SOFT") {
    if (period.status === AccountingPeriodStatus.HARD_CLOSED) {
      throw new FinancePostingError(
        `Accounting period ${input.periodKey} is already hard closed`,
        "PERIOD_ALREADY_HARD_CLOSED"
      )
    }

    if (period.status === AccountingPeriodStatus.SOFT_CLOSED) {
      return period
    }

    return tx.accountingPeriod.update({
      where: { id: period.id },
      data: {
        status: AccountingPeriodStatus.SOFT_CLOSED,
        closedAt: new Date(),
      },
    })
  }

  if (period.status === AccountingPeriodStatus.HARD_CLOSED) {
    return period
  }

  const statusBefore = period.status
  const { checklist, priorSnapshotRef, snapshotPayload } =
    await buildCloseReadinessWithSnapshotsForPeriod(tx, period)
  const policy = getHardCloseGatePolicy()
  assertCloseReadiness(checklist, policy)

  const closedAt = new Date()
  const updated = await tx.accountingPeriod.update({
    where: { id: period.id },
    data: {
      status: AccountingPeriodStatus.HARD_CLOSED,
      closedAt,
    },
  })

  await createCloseEvidenceForHardClose(tx, {
    period: {
      id: updated.id,
      branchId: updated.branchId,
      periodKey: updated.periodKey,
      statusBefore,
      openedAt: updated.openedAt,
      closedAt,
    },
    closedBy: requireHardCloseActor(input.closedBy),
    policy,
    checklist,
    priorSnapshotRef,
    snapshotPayload,
  })

  return updated
}

export async function reopenAccountingPeriod(
  tx: Prisma.TransactionClient,
  input: PeriodReopenInput
): Promise<NonNullable<Awaited<ReturnType<typeof tx.accountingPeriod.findUnique>>>> {
  const period = await findAccountingPeriod(tx, input)

  if (period.status === AccountingPeriodStatus.OPEN) {
    return period
  }

  const reason = requireReopenReason(input.reason)
  const reopenedBy = requireReopenActor(input.reopenedBy)

  if (period.status === AccountingPeriodStatus.HARD_CLOSED) {
    await createReopenEvidence(tx, {
      period: {
        id: period.id,
        branchId: period.branchId,
        periodKey: period.periodKey,
        status: AccountingPeriodStatus.HARD_CLOSED,
      },
      toStatus: AccountingPeriodStatus.SOFT_CLOSED,
      reason,
      reopenedBy,
      reopenRequestId: input.reopenRequestId,
      approval: input.approval,
    })

    return tx.accountingPeriod.update({
      where: { id: period.id },
      data: {
        status: AccountingPeriodStatus.SOFT_CLOSED,
        closedAt: period.closedAt ?? new Date(),
      },
    })
  }

  if (period.status === AccountingPeriodStatus.SOFT_CLOSED) {
    const activeClosingEntry = await getActiveClosingEntry(tx, period.id)
    if (activeClosingEntry) {
      throw new FinancePostingError(
        "Reverse the period closing entry before reopening to OPEN",
        "CLOSING_ENTRY_REOPEN_BLOCKED"
      )
    }

    await createReopenEvidence(tx, {
      period: {
        id: period.id,
        branchId: period.branchId,
        periodKey: period.periodKey,
        status: AccountingPeriodStatus.SOFT_CLOSED,
      },
      toStatus: AccountingPeriodStatus.OPEN,
      reason,
      reopenedBy,
      reopenRequestId: input.reopenRequestId,
      approval: input.approval,
    })

    return tx.accountingPeriod.update({
      where: { id: period.id },
      data: {
        status: AccountingPeriodStatus.OPEN,
        closedAt: null,
      },
    })
  }

  throw new FinancePostingError(
    `Accounting period ${input.periodKey} is not in a reopenable state`,
    "INVALID_REOPEN_TRANSITION"
  )
}
