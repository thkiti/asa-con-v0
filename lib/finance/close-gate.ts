import type { CloseBlockerRuleId } from "./close-blocker-rules"
import { sortCloseChecklistItems } from "./close-checklist"
import type {
  CloseChecklistItem,
  CloseChecklistResult,
  CloseReadinessStatus,
} from "./close-checklist-types"
import {
  CloseGateError,
  type CloseGateBlocker,
  type CloseGateErrorCode,
} from "./close-gate-errors"

export type CloseGatePolicy = {
  rejectBlocked: boolean
  rejectWarnings: boolean
  warningExemptRuleIds?: CloseBlockerRuleId[]
}

export const DEFAULT_CLOSE_GATE_POLICY: CloseGatePolicy = {
  rejectBlocked: true,
  rejectWarnings: false,
}

const SNAPSHOT_BLOCKED_RULE_IDS = new Set<CloseBlockerRuleId>([
  "snapshot-missing",
  "reconciliation-no-snapshot",
  "snapshot-branch-mismatch",
  "snapshot-period-mismatch",
  "snapshot-missing-inventory-domain",
  "snapshot-missing-revenue-domain",
])

const EVIDENCE_BLOCKED_RULE_IDS = new Set<CloseBlockerRuleId>([
  "audit-evidence-unavailable",
])

function toCloseGateBlocker(item: CloseChecklistItem): CloseGateBlocker {
  return {
    id: item.id,
    group: item.group,
    severity: item.severity,
    title: item.title,
    detail: item.detail,
    refs: item.refs,
  }
}

function isWarningExempt(
  ruleId: CloseBlockerRuleId,
  policy: CloseGatePolicy
): boolean {
  return (policy.warningExemptRuleIds ?? []).includes(ruleId)
}

export function selectCloseGateFailures(
  items: CloseChecklistItem[],
  policy: CloseGatePolicy = DEFAULT_CLOSE_GATE_POLICY
): CloseChecklistItem[] {
  return items.filter((item) => {
    if (item.severity === "BLOCKED") {
      return policy.rejectBlocked
    }
    if (item.severity === "WARNING") {
      return policy.rejectWarnings && !isWarningExempt(item.id as CloseBlockerRuleId, policy)
    }
    return false
  })
}

export function sortCloseGateBlockers(
  items: CloseChecklistItem[]
): CloseGateBlocker[] {
  return sortCloseChecklistItems(items).map(toCloseGateBlocker)
}

export function resolveCloseGateErrorCode(
  failingBlockers: CloseGateBlocker[],
  readinessStatus: CloseReadinessStatus
): CloseGateErrorCode {
  if (failingBlockers.some((blocker) => SNAPSHOT_BLOCKED_RULE_IDS.has(blocker.id as CloseBlockerRuleId))) {
    return "CLOSE_SNAPSHOT_REQUIRED"
  }

  if (
    failingBlockers.some((blocker) =>
      EVIDENCE_BLOCKED_RULE_IDS.has(blocker.id as CloseBlockerRuleId)
    )
  ) {
    return "CLOSE_EVIDENCE_REQUIRED"
  }

  if (failingBlockers.some((blocker) => blocker.severity === "BLOCKED")) {
    return "CLOSE_BLOCKED"
  }

  if (readinessStatus === "WARNING" || failingBlockers.some((blocker) => blocker.severity === "WARNING")) {
    return "CLOSE_READINESS_FAILED"
  }

  return "CLOSE_BLOCKED"
}

function defaultCloseGateMessage(blockerCount: number): string {
  const label = blockerCount === 1 ? "blocker" : "blockers"
  return `Period close blocked: ${blockerCount} ${label} must be resolved`
}

export function buildCloseBlockerError(input: {
  checklist: CloseChecklistResult
  policy?: CloseGatePolicy
  message?: string
}): CloseGateError {
  const policy = input.policy ?? DEFAULT_CLOSE_GATE_POLICY
  const failingItems = selectCloseGateFailures(input.checklist.items, policy)
  const blockers = sortCloseGateBlockers(failingItems)
  const code = resolveCloseGateErrorCode(blockers, input.checklist.status)
  const message =
    input.message ?? defaultCloseGateMessage(blockers.length)

  return new CloseGateError(
    message,
    code,
    input.checklist.status,
    blockers
  )
}

export function assertCloseReadiness(
  checklist: CloseChecklistResult,
  policy: CloseGatePolicy = DEFAULT_CLOSE_GATE_POLICY
): void {
  const failures = selectCloseGateFailures(checklist.items, policy)
  if (failures.length === 0) {
    return
  }

  throw buildCloseBlockerError({ checklist, policy })
}

export {
  CloseGateError,
  toCloseGateErrorPayload,
  type CloseGateBlocker,
  type CloseGateErrorCode,
  type CloseGateErrorPayload,
} from "./close-gate-errors"
