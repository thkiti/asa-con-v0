import type { ClosePolicyRole } from "./close-policy"

export const REOPEN_EVIDENCE_PAYLOAD_VERSION = 1 as const

export type ReopenEvidencePayloadVersion = typeof REOPEN_EVIDENCE_PAYLOAD_VERSION

export type ReopenActorSnapshot = {
  reopenedByStaffId: string
  reopenedByName: string
  reopenedByRole: ClosePolicyRole
}

export type ReopenEvidencePayloadV1 = {
  payloadVersion: ReopenEvidencePayloadVersion
  period: {
    id: string
    branchId: string
    periodKey: string
    fromStatus: string
    toStatus: string
    reopenedAt: string
  }
  reopen: ReopenActorSnapshot & {
    reason: string
  }
  closeEvidenceId: string | null
  reopenRequestId?: string | null
  approval?: ReopenEvidenceApprovalSnapshot | null
}

export type ReopenEvidenceApprovalSnapshot = {
  reopenRequestId: string
  requestNo: string
  requestedByStaffId: string
  requestedByName: string
  requestedByRole: ClosePolicyRole
  requestedAt: string
  approvedByStaffId: string
  approvedByName: string
  approvedByRole: ClosePolicyRole
  approvedAt: string
  approvalNote?: string | null
}

export type ReopenEvidenceDetail = {
  id: string
  periodId: string
  branchId: string
  periodKey: string
  fromStatus: string
  toStatus: string
  reopenedAt: string
  reopenedByStaffId: string
  reopenedByName: string
  reopenedByRole: string
  reason: string
  closeEvidenceId: string | null
  payloadVersion: number
  payload: ReopenEvidencePayloadV1
  createdAt: string
}
