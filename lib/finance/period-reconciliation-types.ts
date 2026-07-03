import type { PeriodReconciliationStatus } from "@/generated/prisma/client"

export type { PeriodReconciliationStatus }

export type PeriodReconciliationAmounts = {
  outstandingDeposits: string
  outstandingPayments: string
  bankCharges: string
  interest: string
  adjustments: string
}

export type PeriodReconciliationWorkflowActor = {
  staffId: string
  at: Date
}

export type PeriodReconciliationWorkflowTimestamps = {
  submittedAt: string | null
  submittedByStaffId: string | null
  confirmedAt: string | null
  confirmedByStaffId: string | null
  lockedAt: string | null
  lockedByStaffId: string | null
}

export function isPeriodReconciliationComplete(
  status: PeriodReconciliationStatus
): boolean {
  return status === "CONFIRMED" || status === "LOCKED"
}

export function isPeriodReconciliationEditable(
  status: PeriodReconciliationStatus
): boolean {
  return status === "DRAFT"
}
