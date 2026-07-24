import { StatusBadge, type StatusBadgeTone } from "@/components/ui/StatusBadge"
import type { CollectorPickupSettlementStatus } from "@/lib/finance-ui/pos-settlement-status-types"

const STATUS_TONE: Record<CollectorPickupSettlementStatus, StatusBadgeTone> = {
  NOT_POSTED: "neutral",
  POSTED: "ok",
  VARIANCE: "warning",
  INVALID_SOURCE: "caution",
}

type CollectorPickupSettlementStatusBadgeProps = {
  status: CollectorPickupSettlementStatus
}

export function CollectorPickupSettlementStatusBadge({
  status,
}: CollectorPickupSettlementStatusBadgeProps) {
  return (
    <StatusBadge
      tone={STATUS_TONE[status]}
      size="xs"
      className="uppercase tracking-wide"
    >
      {status.replace("_", " ")}
    </StatusBadge>
  )
}
