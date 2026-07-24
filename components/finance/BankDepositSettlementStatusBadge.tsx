"use client"

import { StatusBadge, type StatusBadgeTone } from "@/components/ui/StatusBadge"
import type { BankDepositSettlementStatus } from "@/lib/finance-ui/pos-settlement-status-types"

const STATUS_TONE: Record<BankDepositSettlementStatus, StatusBadgeTone> = {
  NOT_POSTED: "neutral",
  POSTED: "ok",
  VARIANCE: "warning",
  INVALID_SOURCE: "caution",
  NOT_ELIGIBLE: "muted",
}

type BankDepositSettlementStatusBadgeProps = {
  status: BankDepositSettlementStatus
}

export function BankDepositSettlementStatusBadge({
  status,
}: BankDepositSettlementStatusBadgeProps) {
  return (
    <StatusBadge
      tone={STATUS_TONE[status]}
      size="xs"
      className="uppercase tracking-wide"
    >
      {status.replace(/_/g, " ")}
    </StatusBadge>
  )
}
