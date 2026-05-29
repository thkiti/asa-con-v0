import type { CloseBlockerRuleId } from "./close-blocker-rules"

/**
 * Centralized close gate policy for HARD close enforcement.
 * v1: no env-based configuration — change policy here only.
 */
export type CloseGatePolicy = {
  /** BLOCKED checklist items reject HARD close when true */
  rejectBlocked: boolean
  /** WARNING checklist items reject HARD close when true */
  rejectWarnings: boolean
  /** WARNING rule ids excluded when rejectWarnings is true */
  warningExemptRuleIds?: CloseBlockerRuleId[]
}

/** v1 default: BLOCKED rejects; WARNING allowed */
export const DEFAULT_CLOSE_GATE_POLICY: CloseGatePolicy = {
  rejectBlocked: true,
  rejectWarnings: false,
  warningExemptRuleIds: [],
}

/** Strict variant for tests / future admin override workflows */
export const STRICT_CLOSE_GATE_POLICY: CloseGatePolicy = {
  rejectBlocked: true,
  rejectWarnings: true,
  warningExemptRuleIds: [],
}

/** Policy applied at the HARD close domain boundary */
export const HARD_CLOSE_GATE_POLICY: CloseGatePolicy = DEFAULT_CLOSE_GATE_POLICY

export function getHardCloseGatePolicy(): CloseGatePolicy {
  return HARD_CLOSE_GATE_POLICY
}

export function normalizeCloseGatePolicy(
  policy?: CloseGatePolicy
): CloseGatePolicy {
  return policy ?? getHardCloseGatePolicy()
}

/** Close gate applies to HARD close only — SOFT close is review-only, ungated */
export function closeGateAppliesToCloseMode(mode: "SOFT" | "HARD"): boolean {
  return mode === "HARD"
}
