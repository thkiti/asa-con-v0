import { AccountingPeriodStatus } from "@/generated/prisma/client"
import type { PeriodPostingContext, PeriodStatusLabel } from "./reconciliation-types"

export type ClosePolicyRole = "ROUTINE" | "HO_FINANCE" | "HO_ADMIN"

export class ClosePolicyError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = "ClosePolicyError"
    this.code = code
  }
}

function hasReason(overrideReason?: string | null): boolean {
  return Boolean(overrideReason?.trim())
}

export function canManagePeriodStatus(role: ClosePolicyRole): boolean {
  return role === "HO_FINANCE" || role === "HO_ADMIN"
}

export function canPostToPeriod(
  status: AccountingPeriodStatus,
  role: ClosePolicyRole,
  hasOverrideReason: boolean
): boolean {
  if (status === AccountingPeriodStatus.OPEN) {
    return true
  }

  if (status === AccountingPeriodStatus.SOFT_CLOSED) {
    if (role === "ROUTINE") return false
    return hasOverrideReason && (role === "HO_FINANCE" || role === "HO_ADMIN")
  }

  if (status === AccountingPeriodStatus.HARD_CLOSED) {
    if (role === "HO_ADMIN" && hasOverrideReason) return true
    return false
  }

  return false
}

export function canOverridePeriod(
  status: AccountingPeriodStatus,
  role: ClosePolicyRole,
  hasOverrideReason: boolean
): boolean {
  if (status === AccountingPeriodStatus.OPEN) {
    return false
  }

  if (status === AccountingPeriodStatus.SOFT_CLOSED) {
    return hasOverrideReason && (role === "HO_FINANCE" || role === "HO_ADMIN")
  }

  if (status === AccountingPeriodStatus.HARD_CLOSED) {
    return hasOverrideReason && role === "HO_ADMIN"
  }

  return false
}

export function classifyPeriodStatus(
  status: AccountingPeriodStatus
): PeriodStatusLabel {
  switch (status) {
    case AccountingPeriodStatus.OPEN:
      return {
        status,
        label: "Open",
        description: "Normal posting allowed for the period",
      }
    case AccountingPeriodStatus.SOFT_CLOSED:
      return {
        status,
        label: "Soft closed",
        description:
          "Month-end in progress — routine posting blocked; finance override with reason",
      }
    case AccountingPeriodStatus.HARD_CLOSED:
      return {
        status,
        label: "Hard closed",
        description:
          "Period locked — routine and finance posting blocked; admin adjustment path only",
      }
    default:
      return {
        status,
        label: "Unknown",
        description: "Unrecognized accounting period status",
      }
  }
}

export function requireOpenPeriodForPosting(
  period: { status: AccountingPeriodStatus; periodKey?: string },
  context: PeriodPostingContext
): void {
  const reasonProvided = hasReason(context.overrideReason)
  if (canPostToPeriod(period.status, context.role, reasonProvided)) {
    return
  }

  const periodRef = period.periodKey ? ` (${period.periodKey})` : ""
  if (period.status === AccountingPeriodStatus.SOFT_CLOSED) {
    throw new ClosePolicyError(
      `Accounting period${periodRef} is soft closed — finance override with reason required`,
      "PERIOD_SOFT_CLOSED"
    )
  }
  if (period.status === AccountingPeriodStatus.HARD_CLOSED) {
    throw new ClosePolicyError(
      `Accounting period${periodRef} is hard closed — admin override with reason required`,
      "PERIOD_HARD_CLOSED"
    )
  }

  throw new ClosePolicyError(
    `Accounting period${periodRef} is not open for posting`,
    "PERIOD_CLOSED"
  )
}
