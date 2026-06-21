import type { PaymentVoucherStatus } from "@/generated/prisma/client"
import {
  PaymentVoucherErrorCodes,
  PaymentVoucherPolicyError,
} from "./payment-voucher-errors"
import type {
  PaymentVoucherTransitionContext,
  PaymentVoucherWorkflowAction,
} from "./payment-voucher-types"

const TERMINAL_STATUSES: ReadonlySet<PaymentVoucherStatus> = new Set([
  "POSTED",
  "CANCELLED",
])

type TransitionRule = {
  action: PaymentVoucherWorkflowAction
  from: PaymentVoucherStatus
  to: PaymentVoucherStatus
}

const WORKFLOW_TRANSITIONS: readonly TransitionRule[] = [
  { action: "SUBMIT", from: "DRAFT", to: "SUBMITTED" },
  { action: "CONFIRM", from: "SUBMITTED", to: "CONFIRMED" },
  { action: "CANCEL", from: "SUBMITTED", to: "CANCELLED" },
  { action: "POST", from: "CONFIRMED", to: "POSTED" },
  { action: "CANCEL", from: "CONFIRMED", to: "CANCELLED" },
]

export function isTerminalPaymentVoucherStatus(
  status: PaymentVoucherStatus
): boolean {
  return TERMINAL_STATUSES.has(status)
}

export function isImmutablePaymentVoucherStatus(
  status: PaymentVoucherStatus
): boolean {
  return isTerminalPaymentVoucherStatus(status)
}

function findWorkflowRule(
  action: PaymentVoucherWorkflowAction,
  fromStatus: PaymentVoucherStatus
): TransitionRule | undefined {
  return WORKFLOW_TRANSITIONS.find(
    (rule) => rule.action === action && rule.from === fromStatus
  )
}

export function assertPaymentVoucherTransitionAllowed(
  ctx: PaymentVoucherTransitionContext
): void {
  const { fromStatus, action } = ctx

  if (isTerminalPaymentVoucherStatus(fromStatus)) {
    throw new PaymentVoucherPolicyError(
      `Cannot transition from terminal status ${fromStatus}`,
      PaymentVoucherErrorCodes.IMMUTABLE_ENTRY
    )
  }

  const rule = findWorkflowRule(action, fromStatus)
  if (!rule) {
    throw new PaymentVoucherPolicyError(
      `Action ${action} not allowed from ${fromStatus}`,
      PaymentVoucherErrorCodes.INVALID_TRANSITION
    )
  }
}

export function targetPaymentVoucherStatusForAction(
  action: PaymentVoucherWorkflowAction,
  fromStatus: PaymentVoucherStatus
): PaymentVoucherStatus {
  const rule = findWorkflowRule(action, fromStatus)
  if (!rule) {
    throw new PaymentVoucherPolicyError(
      `Action ${action} not allowed from ${fromStatus}`,
      PaymentVoucherErrorCodes.INVALID_TRANSITION
    )
  }
  return rule.to
}
