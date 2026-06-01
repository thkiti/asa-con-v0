import type {
  AccountingPeriodReopenRequest,
  Prisma,
} from "@/generated/prisma/client"
import {
  AccountingPeriodReopenRequestStatus,
  AccountingPeriodStatus,
} from "@/generated/prisma/client"
import type { PrismaClient } from "@/generated/prisma/client"
import type { ClosePolicyRole } from "./close-policy"
import {
  getLatestCloseEvidenceByPeriodId,
  resolveCloseActorSnapshot,
  type PeriodCloseActorInput,
} from "./close-evidence"
import { reopenAccountingPeriod } from "./period-close"
import {
  getReopenApprovalPolicy,
  reopenApprovalRequired,
  type ReopenApprovalPolicy,
} from "./reopen-approval-policy"
import { ReopenRequestError } from "./reopen-request-errors"
import {
  REOPEN_REQUEST_PAYLOAD_VERSION,
  type ReopenRequestDetail,
  type ReopenRequestPayloadV1,
} from "./reopen-request-types"
import type { ReopenEvidenceApprovalSnapshot } from "./reopen-evidence-types"

export type ReopenRequestPrisma = Pick<
  PrismaClient,
  "accountingPeriodReopenRequest" | "accountingPeriod"
>

const POLICY_KEY = "default"

function parseReopenRequestPayload(value: unknown): ReopenRequestPayloadV1 {
  return value as ReopenRequestPayloadV1
}

function toReopenRequestDetail(
  row: AccountingPeriodReopenRequest
): ReopenRequestDetail {
  return {
    id: row.id,
    requestNo: row.requestNo,
    periodId: row.periodId,
    branchId: row.branchId,
    periodKey: row.periodKey,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    reason: row.reason,
    status: row.status,
    requestedAt: row.requestedAt.toISOString(),
    requestedByStaffId: row.requestedByStaffId,
    requestedByName: row.requestedByName,
    requestedByRole: row.requestedByRole,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    approvedByStaffId: row.approvedByStaffId,
    approvedByName: row.approvedByName,
    approvedByRole: row.approvedByRole,
    approvalNote: row.approvalNote,
    rejectedAt: row.rejectedAt?.toISOString() ?? null,
    rejectedByStaffId: row.rejectedByStaffId,
    rejectedByName: row.rejectedByName,
    rejectedByRole: row.rejectedByRole,
    rejectionNote: row.rejectionNote,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    cancelledByStaffId: row.cancelledByStaffId,
    cancelledByName: row.cancelledByName,
    cancelledByRole: row.cancelledByRole,
    executedAt: row.executedAt?.toISOString() ?? null,
    reopenEvidenceId: row.reopenEvidenceId,
    closeEvidenceId: row.closeEvidenceId,
    policyKey: row.policyKey,
    payloadVersion: row.payloadVersion,
    payload: parseReopenRequestPayload(row.payload),
    createdAt: row.createdAt.toISOString(),
  }
}

function requireReason(reason: string | undefined): string {
  const trimmed = reason?.trim() ?? ""
  if (!trimmed) {
    throw new ReopenRequestError(
      "reason is required for reopen request",
      "VALIDATION_ERROR"
    )
  }
  return trimmed
}

function resolveReopenRequestActor(
  input: PeriodCloseActorInput
): ReturnType<typeof resolveCloseActorSnapshot> {
  return resolveCloseActorSnapshot(input)
}

function requireRequestActorRole(actorRole: ClosePolicyRole): void {
  if (actorRole !== "HO_FINANCE" && actorRole !== "HO_ADMIN") {
    throw new ReopenRequestError(
      "Reopen request requires HO_FINANCE or HO_ADMIN role",
      "FORBIDDEN"
    )
  }
}

function requireHardReopenApproverRole(actorRole: ClosePolicyRole): void {
  if (actorRole !== "HO_ADMIN") {
    throw new ReopenRequestError(
      "HARD reopen approval requires HO_ADMIN role",
      "REOPEN_APPROVER_FORBIDDEN"
    )
  }
}

function resolveReopenTransition(fromStatus: AccountingPeriodStatus): {
  fromStatus: AccountingPeriodStatus
  toStatus: AccountingPeriodStatus
} {
  if (fromStatus === AccountingPeriodStatus.HARD_CLOSED) {
    return {
      fromStatus,
      toStatus: AccountingPeriodStatus.SOFT_CLOSED,
    }
  }
  if (fromStatus === AccountingPeriodStatus.SOFT_CLOSED) {
    return {
      fromStatus,
      toStatus: AccountingPeriodStatus.OPEN,
    }
  }
  throw new ReopenRequestError(
    "Period is not in a reopenable state",
    "INVALID_REOPEN_TRANSITION"
  )
}

export function assertDirectReopenAllowed(
  fromStatus: AccountingPeriodStatus,
  policy: ReopenApprovalPolicy = getReopenApprovalPolicy()
): void {
  if (reopenApprovalRequired(fromStatus, policy)) {
    throw new ReopenRequestError(
      "HARD reopen requires an approved reopen request — submit a request first",
      "REOPEN_APPROVAL_REQUIRED"
    )
  }
}

async function findPeriodById(
  tx: Prisma.TransactionClient,
  periodId: string
): Promise<NonNullable<Awaited<ReturnType<typeof tx.accountingPeriod.findUnique>>>> {
  const period = await tx.accountingPeriod.findUnique({
    where: { id: periodId.trim() },
  })
  if (!period) {
    throw new ReopenRequestError(
      "Accounting period not found",
      "PERIOD_NOT_FOUND"
    )
  }
  return period
}

async function assertNoPendingRequest(
  tx: Prisma.TransactionClient,
  periodId: string
): Promise<void> {
  const pending = await tx.accountingPeriodReopenRequest.findFirst({
    where: {
      periodId,
      status: AccountingPeriodReopenRequestStatus.PENDING,
    },
  })
  if (pending) {
    throw new ReopenRequestError(
      "A pending reopen request already exists for this period",
      "REOPEN_REQUEST_PENDING"
    )
  }
}

async function nextRequestNo(
  tx: Prisma.TransactionClient,
  periodKey: string
): Promise<string> {
  const existing = await tx.accountingPeriodReopenRequest.count({
    where: { periodKey },
  })
  const seq = existing + 1
  return `RRO-${periodKey}-${String(seq).padStart(4, "0")}`
}

function buildReopenRequestPayload(input: {
  period: { id: string; branchId: string; periodKey: string }
  fromStatus: AccountingPeriodStatus
  toStatus: AccountingPeriodStatus
  reason: string
  requestedAt: Date
  requester: ReturnType<typeof resolveCloseActorSnapshot>
  closeEvidenceId: string | null
  policyKey: string
}): ReopenRequestPayloadV1 {
  return {
    payloadVersion: REOPEN_REQUEST_PAYLOAD_VERSION,
    period: {
      id: input.period.id,
      branchId: input.period.branchId,
      periodKey: input.period.periodKey,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
    },
    request: {
      reason: input.reason,
      requestedAt: input.requestedAt.toISOString(),
      requestedByStaffId: input.requester.closedByStaffId,
      requestedByName: input.requester.closedByName,
      requestedByRole: input.requester.closedByRole,
    },
    closeEvidenceId: input.closeEvidenceId,
    policyKey: input.policyKey,
  }
}

export type CreateReopenRequestInput = {
  periodId: string
  reason: string
  requestedBy: PeriodCloseActorInput
}

export async function createReopenRequest(
  tx: Prisma.TransactionClient,
  input: CreateReopenRequestInput
): Promise<ReopenRequestDetail> {
  const reason = requireReason(input.reason)
  const requester = resolveReopenRequestActor(input.requestedBy)
  requireRequestActorRole(requester.closedByRole)

  const period = await findPeriodById(tx, input.periodId)
  const policy = getReopenApprovalPolicy()

  if (!reopenApprovalRequired(period.status, policy)) {
    throw new ReopenRequestError(
      "Reopen approval is not required for this period status — use direct REOPEN",
      "INVALID_REOPEN_TRANSITION"
    )
  }

  const { fromStatus, toStatus } = resolveReopenTransition(period.status)
  await assertNoPendingRequest(tx, period.id)

  let closeEvidenceId: string | null = null
  if (fromStatus === AccountingPeriodStatus.HARD_CLOSED) {
    const latest = await getLatestCloseEvidenceByPeriodId(tx, period.id)
    closeEvidenceId = latest.id
  }

  const requestedAt = new Date()
  const requestNo = await nextRequestNo(tx, period.periodKey)
  const payload = buildReopenRequestPayload({
    period: {
      id: period.id,
      branchId: period.branchId,
      periodKey: period.periodKey,
    },
    fromStatus,
    toStatus,
    reason,
    requestedAt,
    requester,
    closeEvidenceId,
    policyKey: POLICY_KEY,
  })

  const row = await tx.accountingPeriodReopenRequest.create({
    data: {
      requestNo,
      periodId: period.id,
      branchId: period.branchId,
      periodKey: period.periodKey,
      fromStatus,
      toStatus,
      reason,
      status: AccountingPeriodReopenRequestStatus.PENDING,
      requestedAt,
      requestedByStaffId: requester.closedByStaffId,
      requestedByName: requester.closedByName,
      requestedByRole: requester.closedByRole,
      closeEvidenceId,
      policyKey: POLICY_KEY,
      payloadVersion: REOPEN_REQUEST_PAYLOAD_VERSION,
      payload: payload as Prisma.InputJsonValue,
    },
  })

  return toReopenRequestDetail(row)
}

async function findPendingRequest(
  tx: Prisma.TransactionClient,
  requestId: string
): Promise<AccountingPeriodReopenRequest> {
  const row = await tx.accountingPeriodReopenRequest.findUnique({
    where: { id: requestId.trim() },
  })
  if (!row) {
    throw new ReopenRequestError(
      "Reopen request not found",
      "REOPEN_REQUEST_NOT_FOUND"
    )
  }
  if (row.status !== AccountingPeriodReopenRequestStatus.PENDING) {
    throw new ReopenRequestError(
      "Reopen request is not pending",
      "REOPEN_REQUEST_NOT_PENDING"
    )
  }
  return row
}

function assertSeparateApprover(
  requesterStaffId: string,
  approverStaffId: string,
  policy: ReopenApprovalPolicy
): void {
  if (
    policy.requireSeparateApprover &&
    requesterStaffId.trim() === approverStaffId.trim()
  ) {
    throw new ReopenRequestError(
      "Approver must differ from requester",
      "REOPEN_SELF_APPROVAL_FORBIDDEN"
    )
  }
}

function buildApprovalSnapshot(
  request: AccountingPeriodReopenRequest,
  approver: ReturnType<typeof resolveCloseActorSnapshot>,
  approvedAt: Date,
  approvalNote?: string | null
): ReopenEvidenceApprovalSnapshot {
  return {
    reopenRequestId: request.id,
    requestNo: request.requestNo,
    requestedByStaffId: request.requestedByStaffId,
    requestedByName: request.requestedByName,
    requestedByRole: request.requestedByRole as ClosePolicyRole,
    requestedAt: request.requestedAt.toISOString(),
    approvedByStaffId: approver.closedByStaffId,
    approvedByName: approver.closedByName,
    approvedByRole: approver.closedByRole,
    approvedAt: approvedAt.toISOString(),
    approvalNote: approvalNote?.trim() || null,
  }
}

export type ApproveReopenRequestInput = {
  requestId: string
  approvedBy: PeriodCloseActorInput
  approvalNote?: string | null
}

export async function approveReopenRequest(
  tx: Prisma.TransactionClient,
  input: ApproveReopenRequestInput
): Promise<ReopenRequestDetail> {
  const request = await findPendingRequest(tx, input.requestId)
  const approver = resolveReopenRequestActor(input.approvedBy)
  const policy = getReopenApprovalPolicy()

  if (request.fromStatus === AccountingPeriodStatus.HARD_CLOSED) {
    requireHardReopenApproverRole(approver.closedByRole)
  } else {
    requireRequestActorRole(approver.closedByRole)
  }

  assertSeparateApprover(
    request.requestedByStaffId,
    approver.closedByStaffId,
    policy
  )

  const period = await findPeriodById(tx, request.periodId)
  if (period.status !== request.fromStatus) {
    throw new ReopenRequestError(
      "Period status changed since reopen request was submitted",
      "REOPEN_PERIOD_STATE_CHANGED"
    )
  }

  const approvedAt = new Date()
  const approvalSnapshot = buildApprovalSnapshot(
    request,
    approver,
    approvedAt,
    input.approvalNote
  )

  await reopenAccountingPeriod(tx, {
    branchId: period.branchId,
    periodKey: period.periodKey,
    reason: request.reason,
    reopenedBy: input.approvedBy,
    reopenRequestId: request.id,
    approval: approvalSnapshot,
  })

  const evidence = await tx.accountingPeriodReopenEvidence.findFirst({
    where: { periodId: period.id },
    orderBy: { reopenedAt: "desc" },
  })

  const executedAt = new Date()
  const updated = await tx.accountingPeriodReopenRequest.update({
    where: { id: request.id },
    data: {
      status: AccountingPeriodReopenRequestStatus.EXECUTED,
      approvedAt,
      approvedByStaffId: approver.closedByStaffId,
      approvedByName: approver.closedByName,
      approvedByRole: approver.closedByRole,
      approvalNote: input.approvalNote?.trim() || null,
      executedAt,
      reopenEvidenceId: evidence?.id ?? null,
    },
  })

  return toReopenRequestDetail(updated)
}

export type RejectReopenRequestInput = {
  requestId: string
  rejectedBy: PeriodCloseActorInput
  rejectionNote?: string | null
}

export async function rejectReopenRequest(
  tx: Prisma.TransactionClient,
  input: RejectReopenRequestInput
): Promise<ReopenRequestDetail> {
  const request = await findPendingRequest(tx, input.requestId)
  const reviewer = resolveReopenRequestActor(input.rejectedBy)

  if (request.fromStatus === AccountingPeriodStatus.HARD_CLOSED) {
    requireHardReopenApproverRole(reviewer.closedByRole)
  } else {
    requireRequestActorRole(reviewer.closedByRole)
  }

  const rejectedAt = new Date()
  const updated = await tx.accountingPeriodReopenRequest.update({
    where: { id: request.id },
    data: {
      status: AccountingPeriodReopenRequestStatus.REJECTED,
      rejectedAt,
      rejectedByStaffId: reviewer.closedByStaffId,
      rejectedByName: reviewer.closedByName,
      rejectedByRole: reviewer.closedByRole,
      rejectionNote: input.rejectionNote?.trim() || null,
    },
  })

  return toReopenRequestDetail(updated)
}

export type CancelReopenRequestInput = {
  requestId: string
  cancelledBy: PeriodCloseActorInput
}

export async function cancelReopenRequest(
  tx: Prisma.TransactionClient,
  input: CancelReopenRequestInput
): Promise<ReopenRequestDetail> {
  const request = await findPendingRequest(tx, input.requestId)
  const canceller = resolveReopenRequestActor(input.cancelledBy)

  if (canceller.closedByStaffId.trim() !== request.requestedByStaffId.trim()) {
    throw new ReopenRequestError(
      "Only the requester may cancel a pending reopen request",
      "FORBIDDEN"
    )
  }

  const cancelledAt = new Date()
  const updated = await tx.accountingPeriodReopenRequest.update({
    where: { id: request.id },
    data: {
      status: AccountingPeriodReopenRequestStatus.CANCELLED,
      cancelledAt,
      cancelledByStaffId: canceller.closedByStaffId,
      cancelledByName: canceller.closedByName,
      cancelledByRole: canceller.closedByRole,
    },
  })

  return toReopenRequestDetail(updated)
}

export async function listReopenRequestsByPeriodId(
  prisma: ReopenRequestPrisma,
  periodId: string,
  filter?: { status?: AccountingPeriodReopenRequestStatus }
): Promise<ReopenRequestDetail[]> {
  const trimmedId = periodId.trim()
  if (!trimmedId) {
    throw new ReopenRequestError(
      "Accounting period id is required",
      "REOPEN_REQUEST_NOT_FOUND"
    )
  }

  const rows = await prisma.accountingPeriodReopenRequest.findMany({
    where: {
      periodId: trimmedId,
      ...(filter?.status ? { status: filter.status } : {}),
    },
    orderBy: { requestedAt: "desc" },
  })

  return rows.map(toReopenRequestDetail)
}

export async function getReopenRequestById(
  prisma: ReopenRequestPrisma,
  requestId: string
): Promise<ReopenRequestDetail> {
  const trimmedId = requestId.trim()
  if (!trimmedId) {
    throw new ReopenRequestError(
      "Reopen request id is required",
      "REOPEN_REQUEST_NOT_FOUND"
    )
  }

  const row = await prisma.accountingPeriodReopenRequest.findUnique({
    where: { id: trimmedId },
  })

  if (!row) {
    throw new ReopenRequestError(
      "Reopen request not found",
      "REOPEN_REQUEST_NOT_FOUND"
    )
  }

  return toReopenRequestDetail(row)
}

export async function findPendingReopenRequestByPeriodId(
  prisma: ReopenRequestPrisma,
  periodId: string
): Promise<ReopenRequestDetail | null> {
  const row = await prisma.accountingPeriodReopenRequest.findFirst({
    where: {
      periodId: periodId.trim(),
      status: AccountingPeriodReopenRequestStatus.PENDING,
    },
    orderBy: { requestedAt: "desc" },
  })
  return row ? toReopenRequestDetail(row) : null
}
