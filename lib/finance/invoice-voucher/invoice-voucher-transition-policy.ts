import type { InvoiceVoucherStatus } from "@/generated/prisma/client"
import {
  InvoiceVoucherErrorCodes,
  InvoiceVoucherPolicyError,
} from "./invoice-voucher-errors"
import type {
  InvoiceVoucherTransitionContext,
  InvoiceVoucherWorkflowAction,
} from "./invoice-voucher-types"

const TERMINAL_STATUSES: ReadonlySet<InvoiceVoucherStatus> = new Set([
  "POSTED",
  "CANCELLED",
])

type TransitionRule = {
  action: InvoiceVoucherWorkflowAction
  from: InvoiceVoucherStatus
  to: InvoiceVoucherStatus
}

const WORKFLOW_TRANSITIONS: readonly TransitionRule[] = [
  { action: "SUBMIT", from: "DRAFT", to: "SUBMITTED" },
  { action: "CONFIRM", from: "SUBMITTED", to: "CONFIRMED" },
  { action: "CANCEL", from: "SUBMITTED", to: "CANCELLED" },
  { action: "POST", from: "CONFIRMED", to: "POSTED" },
  { action: "CANCEL", from: "CONFIRMED", to: "CANCELLED" },
]

export function isTerminalInvoiceVoucherStatus(
  status: InvoiceVoucherStatus
): boolean {
  return TERMINAL_STATUSES.has(status)
}

export function isImmutableInvoiceVoucherStatus(
  status: InvoiceVoucherStatus
): boolean {
  return isTerminalInvoiceVoucherStatus(status)
}

function findWorkflowRule(
  action: InvoiceVoucherWorkflowAction,
  fromStatus: InvoiceVoucherStatus
): TransitionRule | undefined {
  return WORKFLOW_TRANSITIONS.find(
    (rule) => rule.action === action && rule.from === fromStatus
  )
}

export function assertInvoiceVoucherTransitionAllowed(
  ctx: InvoiceVoucherTransitionContext
): void {
  const { fromStatus, action } = ctx

  if (isTerminalInvoiceVoucherStatus(fromStatus)) {
    throw new InvoiceVoucherPolicyError(
      `Cannot transition from terminal status ${fromStatus}`,
      InvoiceVoucherErrorCodes.IMMUTABLE_ENTRY
    )
  }

  const rule = findWorkflowRule(action, fromStatus)
  if (!rule) {
    throw new InvoiceVoucherPolicyError(
      `Action ${action} not allowed from ${fromStatus}`,
      InvoiceVoucherErrorCodes.INVALID_TRANSITION
    )
  }
}

export function targetInvoiceVoucherStatusForAction(
  action: InvoiceVoucherWorkflowAction,
  fromStatus: InvoiceVoucherStatus
): InvoiceVoucherStatus {
  const rule = findWorkflowRule(action, fromStatus)
  if (!rule) {
    throw new InvoiceVoucherPolicyError(
      `Action ${action} not allowed from ${fromStatus}`,
      InvoiceVoucherErrorCodes.INVALID_TRANSITION
    )
  }
  return rule.to
}
