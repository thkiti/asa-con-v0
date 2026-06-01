import { AccountingPeriodStatus } from "@/generated/prisma/client"

/**
 * Centralized reopen approval policy.
 * v1: no env-based configuration — change policy here only.
 */
export type ReopenApprovalPolicy = {
  /** HARD reopen always requires approval workflow in v1 */
  hardReopenRequiresApproval: true
  /** SOFT reopen uses direct PATCH REOPEN when false */
  softReopenRequiresApproval: boolean
  /** Approver staffId must differ from requester when true */
  requireSeparateApprover: boolean
}

export const DEFAULT_REOPEN_APPROVAL_POLICY: ReopenApprovalPolicy = {
  hardReopenRequiresApproval: true,
  softReopenRequiresApproval: false,
  requireSeparateApprover: true,
}

/** Strict variant for tests / future admin workflows */
export const STRICT_REOPEN_APPROVAL_POLICY: ReopenApprovalPolicy = {
  hardReopenRequiresApproval: true,
  softReopenRequiresApproval: true,
  requireSeparateApprover: true,
}

export function getReopenApprovalPolicy(): ReopenApprovalPolicy {
  return DEFAULT_REOPEN_APPROVAL_POLICY
}

export function normalizeReopenApprovalPolicy(
  policy?: ReopenApprovalPolicy
): ReopenApprovalPolicy {
  return policy ?? getReopenApprovalPolicy()
}

export function reopenApprovalRequired(
  fromStatus: AccountingPeriodStatus,
  policy: ReopenApprovalPolicy = getReopenApprovalPolicy()
): boolean {
  if (fromStatus === AccountingPeriodStatus.HARD_CLOSED) {
    return policy.hardReopenRequiresApproval
  }
  if (fromStatus === AccountingPeriodStatus.SOFT_CLOSED) {
    return policy.softReopenRequiresApproval
  }
  return false
}
