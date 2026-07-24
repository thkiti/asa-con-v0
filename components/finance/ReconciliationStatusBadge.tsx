import { StatusBadge, type StatusBadgeTone } from "@/components/ui/StatusBadge"
import type { ReconciliationRowStatus } from "@/lib/finance-ui/reconciliation"

const STATUS_TONE: Record<ReconciliationRowStatus, StatusBadgeTone> = {
  MATCHED: "ok",
  VARIANCE: "warning",
  MISSING_SOURCE: "caution",
  MISSING_GL: "danger",
}

type ReconciliationStatusBadgeProps = {
  status: ReconciliationRowStatus
}

export function ReconciliationStatusBadge({
  status,
}: ReconciliationStatusBadgeProps) {
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
