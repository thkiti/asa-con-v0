import type { AccountingPeriodReopenEvidence, Prisma } from "@/generated/prisma/client"
import { AccountingPeriodStatus } from "@/generated/prisma/client"
import type { PrismaClient } from "@/generated/prisma/client"
import type { ClosePolicyRole } from "./close-policy"
import { getLatestCloseEvidenceByPeriodId } from "./close-evidence"
import { FinancePostingError } from "./posting-errors"
import type { PeriodCloseActorInput } from "./close-evidence"
import { resolveCloseActorSnapshot } from "./close-evidence"
import {
  REOPEN_EVIDENCE_PAYLOAD_VERSION,
  type ReopenEvidenceDetail,
  type ReopenEvidencePayloadV1,
} from "./reopen-evidence-types"

export type ReopenEvidencePrisma = Pick<
  PrismaClient,
  "accountingPeriodReopenEvidence"
>

function parseReopenEvidencePayload(value: unknown): ReopenEvidencePayloadV1 {
  return value as ReopenEvidencePayloadV1
}

function toReopenEvidenceDetail(row: AccountingPeriodReopenEvidence): ReopenEvidenceDetail {
  return {
    id: row.id,
    periodId: row.periodId,
    branchId: row.branchId,
    periodKey: row.periodKey,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    reopenedAt: row.reopenedAt.toISOString(),
    reopenedByStaffId: row.reopenedByStaffId,
    reopenedByName: row.reopenedByName,
    reopenedByRole: row.reopenedByRole,
    reason: row.reason,
    closeEvidenceId: row.closeEvidenceId,
    payloadVersion: row.payloadVersion,
    payload: parseReopenEvidencePayload(row.payload),
    createdAt: row.createdAt.toISOString(),
  }
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

function requireReopenActorRole(
  actorRole: ClosePolicyRole,
  fromStatus: AccountingPeriodStatus
): void {
  if (fromStatus === AccountingPeriodStatus.HARD_CLOSED) {
    if (actorRole !== "HO_ADMIN") {
      throw new FinancePostingError(
        "HARD reopen requires HO_ADMIN role",
        "FORBIDDEN"
      )
    }
    return
  }

  if (fromStatus === AccountingPeriodStatus.SOFT_CLOSED) {
    if (actorRole !== "HO_FINANCE" && actorRole !== "HO_ADMIN") {
      throw new FinancePostingError(
        "SOFT reopen requires HO_FINANCE or HO_ADMIN role",
        "FORBIDDEN"
      )
    }
    return
  }
}

function buildReopenEvidencePayload(input: {
  period: { id: string; branchId: string; periodKey: string }
  fromStatus: AccountingPeriodStatus
  toStatus: AccountingPeriodStatus
  reopenedAt: Date
  actor: ReturnType<typeof resolveCloseActorSnapshot>
  reason: string
  closeEvidenceId: string | null
}): ReopenEvidencePayloadV1 {
  return {
    payloadVersion: REOPEN_EVIDENCE_PAYLOAD_VERSION,
    period: {
      id: input.period.id,
      branchId: input.period.branchId,
      periodKey: input.period.periodKey,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      reopenedAt: input.reopenedAt.toISOString(),
    },
    reopen: {
      reopenedByStaffId: input.actor.closedByStaffId,
      reopenedByName: input.actor.closedByName,
      reopenedByRole: input.actor.closedByRole,
      reason: input.reason,
    },
    closeEvidenceId: input.closeEvidenceId,
  }
}

export type CreateReopenEvidenceInput = {
  period: {
    id: string
    branchId: string
    periodKey: string
    status: AccountingPeriodStatus
  }
  toStatus: AccountingPeriodStatus
  reason: string
  reopenedBy: PeriodCloseActorInput
}

export async function createReopenEvidence(
  tx: Prisma.TransactionClient,
  input: CreateReopenEvidenceInput
): Promise<ReopenEvidenceDetail> {
  const reason = requireReopenReason(input.reason)
  const actor = resolveCloseActorSnapshot(input.reopenedBy)
  requireReopenActorRole(actor.closedByRole, input.period.status)

  if (input.period.status === AccountingPeriodStatus.HARD_CLOSED) {
    if (input.toStatus !== AccountingPeriodStatus.SOFT_CLOSED) {
      throw new FinancePostingError(
        "HARD_CLOSED period can only reopen to SOFT_CLOSED",
        "INVALID_REOPEN_TRANSITION"
      )
    }
  } else if (input.period.status === AccountingPeriodStatus.SOFT_CLOSED) {
    if (input.toStatus !== AccountingPeriodStatus.OPEN) {
      throw new FinancePostingError(
        "SOFT_CLOSED period can only reopen to OPEN",
        "INVALID_REOPEN_TRANSITION"
      )
    }
  } else {
    throw new FinancePostingError(
      "Period is not in a reopenable state",
      "INVALID_REOPEN_TRANSITION"
    )
  }

  let closeEvidenceId: string | null = null
  if (input.period.status === AccountingPeriodStatus.HARD_CLOSED) {
    const latest = await getLatestCloseEvidenceByPeriodId(tx, input.period.id)
    closeEvidenceId = latest.id
  }

  const reopenedAt = new Date()
  const payload = buildReopenEvidencePayload({
    period: input.period,
    fromStatus: input.period.status,
    toStatus: input.toStatus,
    reopenedAt,
    actor,
    reason,
    closeEvidenceId,
  })

  const row = await tx.accountingPeriodReopenEvidence.create({
    data: {
      periodId: input.period.id,
      branchId: input.period.branchId,
      periodKey: input.period.periodKey,
      fromStatus: input.period.status,
      toStatus: input.toStatus,
      reopenedAt,
      reopenedByStaffId: actor.closedByStaffId,
      reopenedByName: actor.closedByName,
      reopenedByRole: actor.closedByRole,
      reason,
      closeEvidenceId,
      payloadVersion: REOPEN_EVIDENCE_PAYLOAD_VERSION,
      payload: payload as Prisma.InputJsonValue,
    },
  })

  return toReopenEvidenceDetail(row)
}

export async function listReopenEvidenceByPeriodId(
  prisma: ReopenEvidencePrisma,
  periodId: string
): Promise<ReopenEvidenceDetail[]> {
  const trimmedId = periodId.trim()
  if (!trimmedId) {
    throw new FinancePostingError(
      "Accounting period id is required",
      "REOPEN_EVIDENCE_NOT_FOUND"
    )
  }

  const rows = await prisma.accountingPeriodReopenEvidence.findMany({
    where: { periodId: trimmedId },
    orderBy: { reopenedAt: "desc" },
  })

  return rows.map(toReopenEvidenceDetail)
}
