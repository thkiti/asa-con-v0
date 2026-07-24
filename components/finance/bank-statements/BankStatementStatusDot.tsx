"use client"

import {
  TrafficLightStatusDot,
  type TrafficLightStatus,
} from "@/components/ui/TrafficLightStatusDot"
import type { BankStatementStatus } from "@/lib/finance/bank-statement"
import { bankStatementStatusTooltip } from "@/lib/finance-ui/bank-statements"

const STATUS_TO_TRAFFIC: Record<BankStatementStatus, TrafficLightStatus> = {
  NEW: "action_required",
  DRAFT: "in_progress",
  READY: "completed",
}

type BankStatementStatusDotProps = {
  status: BankStatementStatus
  testId?: string
}

export function BankStatementStatusDot({ status, testId }: BankStatementStatusDotProps) {
  return (
    <TrafficLightStatusDot
      status={STATUS_TO_TRAFFIC[status]}
      tooltip={bankStatementStatusTooltip(status)}
      data-testid={testId ?? `bank-statement-status-${status.toLowerCase()}`}
    />
  )
}
