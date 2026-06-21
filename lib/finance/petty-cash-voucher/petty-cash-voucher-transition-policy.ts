import type { PettyCashVoucherStatus } from "@/generated/prisma/client"
import {
  PettyCashVoucherErrorCodes,
  PettyCashVoucherPolicyError,
} from "./petty-cash-voucher-errors"
import type {
  PettyCashVoucherTransitionContext,
  PettyCashVoucherWorkflowAction,
} from "./petty-cash-voucher-types"

const TERMINAL_STATUSES: ReadonlySet<PettyCashVoucherStatus> = new Set([
  "POSTED",
  "CANCELLED",
])

type TransitionRule = {
  action: PettyCashVoucherWorkflowAction
  from: PettyCashVoucherStatus
  to: PettyCashVoucherStatus
}

const WORKFLOW_TRANSITIONS: readonly TransitionRule[] = [
  { action: "SUBMIT", from: "DRAFT", to: "SUBMITTED" },
  { action: "CONFIRM", from: "SUBMITTED", to: "CONFIRMED" },
  { action: "CANCEL", from: "SUBMITTED", to: "CANCELLED" },
  { action: "POST", from: "CONFIRMED", to: "POSTED" },
  { action: "CANCEL", from: "CONFIRMED", to: "CANCELLED" },
]

export function isTerminalPettyCashVoucherStatus(
  status: PettyCashVoucherStatus
): boolean {
  return TERMINAL_STATUSES.has(status)
}

export function isImmutablePettyCashVoucherStatus(
  status: PettyCashVoucherStatus
): boolean {
  return isTerminalPettyCashVoucherStatus(status)
}

function findWorkflowRule(
  action: PettyCashVoucherWorkflowAction,
  fromStatus: PettyCashVoucherStatus
): TransitionRule | undefined {
  return WORKFLOW_TRANSITIONS.find(
    (rule) => rule.action === action && rule.from === fromStatus
  )
}

export function assertPettyCashVoucherTransitionAllowed(
  ctx: PettyCashVoucherTransitionContext
): void {
  const { fromStatus, action } = ctx

  if (isTerminalPettyCashVoucherStatus(fromStatus)) {
    throw new PettyCashVoucherPolicyError(
      `Cannot transition from terminal status ${fromStatus}`,
      PettyCashVoucherErrorCodes.IMMUTABLE_ENTRY
    )
  }

  const rule = findWorkflowRule(action, fromStatus)
  if (!rule) {
    throw new PettyCashVoucherPolicyError(
      `Action ${action} not allowed from ${fromStatus}`,
      PettyCashVoucherErrorCodes.INVALID_TRANSITION
    )
  }
}

export function targetPettyCashVoucherStatusForAction(
  action: PettyCashVoucherWorkflowAction,
  fromStatus: PettyCashVoucherStatus
): PettyCashVoucherStatus {
  const rule = findWorkflowRule(action, fromStatus)
  if (!rule) {
    throw new PettyCashVoucherPolicyError(
      `Action ${action} not allowed from ${fromStatus}`,
      PettyCashVoucherErrorCodes.INVALID_TRANSITION
    )
  }
  return rule.to
}
