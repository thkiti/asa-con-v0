import type { AccountingPeriodCloseEvidence, Prisma } from "@/generated/prisma/client"
import type { PrismaClient } from "@/generated/prisma/client"
import {
  buildCloseEvidencePayload,
  serializeCloseGatePolicyKey,
} from "./close-evidence-build"
import {
  CLOSE_EVIDENCE_PAYLOAD_VERSION,
  type CloseActorSnapshot,
  type CloseEvidenceDetail,
  type CloseEvidencePayloadV1,
} from "./close-evidence-types"
import type { CloseGatePolicy } from "./close-gate-policy"
import type {
  CloseChecklistResult,
  CloseChecklistSnapshotRef,
} from "./close-checklist-types"
import type { ClosePolicyRole } from "./close-policy"
import { FinancePostingError } from "./posting-errors"
import type { ReconciliationSnapshotPayloadV1 } from "./reconciliation-snapshot-types"

export type PeriodCloseActorInput = {
  staffId: string
  name?: string | null
  role?: string | null
}

export type CloseEvidencePrisma = Pick<
  PrismaClient,
  "accountingPeriodCloseEvidence" | "accountingPeriod"
>

function parseCloseEvidencePayload(value: unknown): CloseEvidencePayloadV1 {
  return value as CloseEvidencePayloadV1
}

export function resolveCloseActorSnapshot(
  input: PeriodCloseActorInput
): CloseActorSnapshot {
  const staffId = input.staffId.trim()
  if (!staffId) {
    throw new FinancePostingError(
      "closedBy.staffId is required for HARD close evidence",
      "VALIDATION_ERROR"
    )
  }

  const name = input.name?.trim() || staffId
  const roleRaw = input.role?.trim().toUpperCase()
  let closedByRole: ClosePolicyRole = "HO_FINANCE"
  if (roleRaw === "HO_ADMIN") {
    closedByRole = "HO_ADMIN"
  } else if (roleRaw === "HO_FINANCE") {
    closedByRole = "HO_FINANCE"
  }

  return {
    closedByStaffId: staffId,
    closedByName: name,
    closedByRole,
  }
}

function toCloseEvidenceDetail(row: AccountingPeriodCloseEvidence): CloseEvidenceDetail {
  return {
    id: row.id,
    periodId: row.periodId,
    branchId: row.branchId,
    periodKey: row.periodKey,
    closeMode: row.closeMode,
    closedAt: row.closedAt.toISOString(),
    closedByStaffId: row.closedByStaffId,
    closedByName: row.closedByName,
    closedByRole: row.closedByRole,
    readinessStatus: row.readinessStatus as CloseEvidenceDetail["readinessStatus"],
    gatePolicyKey: row.gatePolicyKey,
    reconciliationSnapshotId: row.reconciliationSnapshotId,
    priorSnapshotId: row.priorSnapshotId,
    payloadVersion: row.payloadVersion,
    payload: parseCloseEvidencePayload(row.payload),
    createdAt: row.createdAt.toISOString(),
  }
}

export type CreateCloseEvidenceForHardCloseInput = {
  period: {
    id: string
    branchId: string
    periodKey: string
    statusBefore: import("@/generated/prisma/client").AccountingPeriodStatus
    openedAt: Date
    closedAt: Date
  }
  closedBy: PeriodCloseActorInput
  policy: CloseGatePolicy
  checklist: CloseChecklistResult
  priorSnapshotRef: CloseChecklistSnapshotRef | null
  snapshotPayload: ReconciliationSnapshotPayloadV1 | null
}

export async function createCloseEvidenceForHardClose(
  tx: Prisma.TransactionClient,
  input: CreateCloseEvidenceForHardCloseInput
): Promise<CloseEvidenceDetail> {
  const actor = resolveCloseActorSnapshot(input.closedBy)
  const payload = buildCloseEvidencePayload({
    period: {
      id: input.period.id,
      branchId: input.period.branchId,
      periodKey: input.period.periodKey,
      statusBefore: input.period.statusBefore,
      openedAt: input.period.openedAt,
    },
    closedAt: input.period.closedAt,
    actor,
    policy: input.policy,
    checklist: input.checklist,
    priorSnapshotRef: input.priorSnapshotRef,
    snapshotPayload: input.snapshotPayload,
  })

  const row = await tx.accountingPeriodCloseEvidence.create({
    data: {
      periodId: input.period.id,
      branchId: input.period.branchId,
      periodKey: input.period.periodKey,
      closeMode: "HARD",
      closedAt: input.period.closedAt,
      closedByStaffId: actor.closedByStaffId,
      closedByName: actor.closedByName,
      closedByRole: actor.closedByRole,
      readinessStatus: input.checklist.status,
      gatePolicyKey: serializeCloseGatePolicyKey(input.policy),
      reconciliationSnapshotId: input.checklist.latestSnapshotRef?.id ?? null,
      priorSnapshotId: input.priorSnapshotRef?.id ?? null,
      payloadVersion: CLOSE_EVIDENCE_PAYLOAD_VERSION,
      payload: payload as Prisma.InputJsonValue,
    },
  })

  return toCloseEvidenceDetail(row)
}

export async function getLatestCloseEvidenceByPeriodId(
  prisma: Pick<PrismaClient, "accountingPeriodCloseEvidence">,
  periodId: string
): Promise<CloseEvidenceDetail> {
  const trimmedId = periodId.trim()
  if (!trimmedId) {
    throw new FinancePostingError(
      "Accounting period id is required",
      "CLOSE_EVIDENCE_NOT_FOUND"
    )
  }

  const row = await prisma.accountingPeriodCloseEvidence.findFirst({
    where: { periodId: trimmedId },
    orderBy: { closedAt: "desc" },
  })

  if (!row) {
    throw new FinancePostingError(
      `Close evidence not found for period: ${trimmedId}`,
      "CLOSE_EVIDENCE_NOT_FOUND"
    )
  }

  return toCloseEvidenceDetail(row)
}

/** Backward-compatible alias — returns latest close evidence by closedAt. */
export async function getCloseEvidenceByPeriodId(
  prisma: Pick<PrismaClient, "accountingPeriodCloseEvidence">,
  periodId: string
): Promise<CloseEvidenceDetail> {
  return getLatestCloseEvidenceByPeriodId(prisma, periodId)
}

export async function listCloseEvidenceByPeriodId(
  prisma: Pick<PrismaClient, "accountingPeriodCloseEvidence">,
  periodId: string
): Promise<CloseEvidenceDetail[]> {
  const trimmedId = periodId.trim()
  if (!trimmedId) {
    throw new FinancePostingError(
      "Accounting period id is required",
      "CLOSE_EVIDENCE_NOT_FOUND"
    )
  }

  const rows = await prisma.accountingPeriodCloseEvidence.findMany({
    where: { periodId: trimmedId },
    orderBy: { closedAt: "desc" },
  })

  return rows.map(toCloseEvidenceDetail)
}

export async function getCloseEvidenceById(
  prisma: Pick<PrismaClient, "accountingPeriodCloseEvidence">,
  evidenceId: string
): Promise<CloseEvidenceDetail> {
  const trimmedId = evidenceId.trim()
  if (!trimmedId) {
    throw new FinancePostingError(
      "Close evidence id is required",
      "CLOSE_EVIDENCE_NOT_FOUND"
    )
  }

  const row = await prisma.accountingPeriodCloseEvidence.findUnique({
    where: { id: trimmedId },
  })

  if (!row) {
    throw new FinancePostingError(
      `Close evidence not found: ${trimmedId}`,
      "CLOSE_EVIDENCE_NOT_FOUND"
    )
  }

  return toCloseEvidenceDetail(row)
}
