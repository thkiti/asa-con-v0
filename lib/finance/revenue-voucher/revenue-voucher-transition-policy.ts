import type { RevenueVoucherStatus } from "@/generated/prisma/client"
import {
  RevenueVoucherErrorCodes,
  RevenueVoucherPolicyError,
} from "./revenue-voucher-errors"
import type {
  RevenueVoucherTransitionContext,
  RevenueVoucherWorkflowAction,
} from "./revenue-voucher-types"

const TERMINAL_STATUSES: ReadonlySet<RevenueVoucherStatus> = new Set([
  "POSTED",
  "CANCELLED",
])

type TransitionRule = {
  action: RevenueVoucherWorkflowAction
  from: RevenueVoucherStatus
  to: RevenueVoucherStatus
}

const WORKFLOW_TRANSITIONS: readonly TransitionRule[] = [
  { action: "SUBMIT", from: "DRAFT", to: "SUBMITTED" },
  { action: "CONFIRM", from: "SUBMITTED", to: "CONFIRMED" },
  { action: "CANCEL", from: "SUBMITTED", to: "CANCELLED" },
  { action: "POST", from: "CONFIRMED", to: "POSTED" },
  { action: "CANCEL", from: "CONFIRMED", to: "CANCELLED" },
]

export function isTerminalRevenueVoucherStatus(
  status: RevenueVoucherStatus
): boolean {
  return TERMINAL_STATUSES.has(status)
}

export function isImmutableRevenueVoucherStatus(
  status: RevenueVoucherStatus
): boolean {
  return isTerminalRevenueVoucherStatus(status)
}

function findWorkflowRule(
  action: RevenueVoucherWorkflowAction,
  fromStatus: RevenueVoucherStatus
): TransitionRule | undefined {
  return WORKFLOW_TRANSITIONS.find(
    (rule) => rule.action === action && rule.from === fromStatus
  )
}

export function assertRevenueVoucherTransitionAllowed(
  ctx: RevenueVoucherTransitionContext
): void {
  const { fromStatus, action } = ctx

  if (isTerminalRevenueVoucherStatus(fromStatus)) {
    throw new RevenueVoucherPolicyError(
      `Cannot transition from terminal status ${fromStatus}`,
      RevenueVoucherErrorCodes.IMMUTABLE_ENTRY
    )
  }

  const rule = findWorkflowRule(action, fromStatus)
  if (!rule) {
    throw new RevenueVoucherPolicyError(
      `Action ${action} not allowed from ${fromStatus}`,
      RevenueVoucherErrorCodes.INVALID_TRANSITION
    )
  }
}

export function targetRevenueVoucherStatusForAction(
  action: RevenueVoucherWorkflowAction,
  fromStatus: RevenueVoucherStatus
): RevenueVoucherStatus {
  const rule = findWorkflowRule(action, fromStatus)
  if (!rule) {
    throw new RevenueVoucherPolicyError(
      `Action ${action} not allowed from ${fromStatus}`,
      RevenueVoucherErrorCodes.INVALID_TRANSITION
    )
  }
  return rule.to
}
