"use client"

import {
  TrafficLightStatusDot,
  type TrafficLightStatus,
} from "@/components/ui/TrafficLightStatusDot"
import type { BankStatementStatus } from "@/lib/finance/bank-statement/bank-statement-types"

const STATUS_TO_TRAFFIC: Record<BankStatementStatus, TrafficLightStatus> = {
  NEW: "action_required",
  DRAFT: "in_progress",
  READY: "completed",
}

export function bankCashCheckStatusTooltip(status: BankStatementStatus): string {
  switch (status) {
    case "READY":
      return "Bank statement check completed."
    case "DRAFT":
      return "Draft — check in progress"
    case "NEW":
      return "New — not yet reviewed"
    default:
      return status
  }
}

type BankCashCheckStatusDotProps = {
  status: BankStatementStatus
  testId?: string
}

export function BankCashCheckStatusDot({ status, testId }: BankCashCheckStatusDotProps) {
  return (
    <TrafficLightStatusDot
      status={STATUS_TO_TRAFFIC[status]}
      tooltip={bankCashCheckStatusTooltip(status)}
      data-testid={testId ?? `bank-cash-check-status-${status.toLowerCase()}`}
    />
  )
}
