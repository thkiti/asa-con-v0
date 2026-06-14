import type { ManualJournalEntryStatus } from "@/generated/prisma/client"
import {
  ManualJournalEntryErrorCodes,
  ManualJournalEntryPolicyError,
} from "./manual-journal-entry-errors"
import type {
  ManualJournalTransitionContext,
  ManualJournalWorkflowAction,
} from "./manual-journal-entry-types"

const TERMINAL_STATUSES: ReadonlySet<ManualJournalEntryStatus> = new Set([
  "POSTED",
  "CANCELLED",
])

type TransitionRule = {
  action: ManualJournalWorkflowAction
  from: ManualJournalEntryStatus
  to: ManualJournalEntryStatus
}

const WORKFLOW_TRANSITIONS: readonly TransitionRule[] = [
  { action: "SUBMIT", from: "DRAFT", to: "SUBMITTED" },
  { action: "CONFIRM", from: "SUBMITTED", to: "CONFIRMED" },
  { action: "CANCEL", from: "SUBMITTED", to: "CANCELLED" },
  { action: "POST", from: "CONFIRMED", to: "POSTED" },
  { action: "CANCEL", from: "CONFIRMED", to: "CANCELLED" },
]

export function isTerminalStatus(status: ManualJournalEntryStatus): boolean {
  return TERMINAL_STATUSES.has(status)
}

export function isImmutableStatus(status: ManualJournalEntryStatus): boolean {
  return isTerminalStatus(status)
}

function findWorkflowRule(
  action: ManualJournalWorkflowAction,
  fromStatus: ManualJournalEntryStatus
): TransitionRule | undefined {
  return WORKFLOW_TRANSITIONS.find(
    (rule) => rule.action === action && rule.from === fromStatus
  )
}

export function assertTransitionAllowed(ctx: ManualJournalTransitionContext): void {
  const { fromStatus, action } = ctx

  if (isTerminalStatus(fromStatus)) {
    throw new ManualJournalEntryPolicyError(
      `Cannot transition from terminal status ${fromStatus}`,
      ManualJournalEntryErrorCodes.IMMUTABLE_ENTRY
    )
  }

  const rule = findWorkflowRule(action, fromStatus)
  if (!rule) {
    throw new ManualJournalEntryPolicyError(
      `Action ${action} not allowed from ${fromStatus}`,
      ManualJournalEntryErrorCodes.INVALID_TRANSITION
    )
  }
}

export function targetStatusForAction(
  action: ManualJournalWorkflowAction,
  fromStatus: ManualJournalEntryStatus
): ManualJournalEntryStatus {
  const rule = findWorkflowRule(action, fromStatus)
  if (!rule) {
    throw new ManualJournalEntryPolicyError(
      `Action ${action} not allowed from ${fromStatus}`,
      ManualJournalEntryErrorCodes.INVALID_TRANSITION
    )
  }
  return rule.to
}
