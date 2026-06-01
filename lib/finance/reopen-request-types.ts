import type { AccountingPeriodReopenRequestStatus } from "@/generated/prisma/client"
import type { ClosePolicyRole } from "./close-policy"

export const REOPEN_REQUEST_PAYLOAD_VERSION = 1 as const

export type ReopenRequestPayloadVersion = typeof REOPEN_REQUEST_PAYLOAD_VERSION

export type ReopenRequestActorSnapshot = {
  staffId: string
  name: string
  role: ClosePolicyRole
}

export type ReopenRequestPayloadV1 = {
  payloadVersion: ReopenRequestPayloadVersion
  period: {
    id: string
    branchId: string
    periodKey: string
    fromStatus: string
    toStatus: string
  }
  request: {
    reason: string
    requestedAt: string
    requestedByStaffId: string
    requestedByName: string
    requestedByRole: ClosePolicyRole
  }
  closeEvidenceId: string | null
  policyKey: string
}

export type ReopenRequestDetail = {
  id: string
  requestNo: string
  periodId: string
  branchId: string
  periodKey: string
  fromStatus: string
  toStatus: string
  reason: string
  status: AccountingPeriodReopenRequestStatus
  requestedAt: string
  requestedByStaffId: string
  requestedByName: string
  requestedByRole: string
  approvedAt: string | null
  approvedByStaffId: string | null
  approvedByName: string | null
  approvedByRole: string | null
  approvalNote: string | null
  rejectedAt: string | null
  rejectedByStaffId: string | null
  rejectedByName: string | null
  rejectedByRole: string | null
  rejectionNote: string | null
  cancelledAt: string | null
  cancelledByStaffId: string | null
  cancelledByName: string | null
  cancelledByRole: string | null
  executedAt: string | null
  reopenEvidenceId: string | null
  closeEvidenceId: string | null
  policyKey: string
  payloadVersion: number
  payload: ReopenRequestPayloadV1
  createdAt: string
}
