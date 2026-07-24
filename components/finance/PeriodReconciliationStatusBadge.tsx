import { StatusBadge, type StatusBadgeTone } from "@/components/ui/StatusBadge"
import type { PeriodReconciliationStatus } from "@/generated/prisma/client"
import { formatPeriodReconciliationStatusLabel } from "@/lib/finance-ui/bank-reconciliation"

const STATUS_TONE: Record<PeriodReconciliationStatus, StatusBadgeTone> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  CONFIRMED: "success",
  LOCKED: "muted",
}

type PeriodReconciliationStatusBadgeProps = {
  status: PeriodReconciliationStatus
}

export function PeriodReconciliationStatusBadge({
  status,
}: PeriodReconciliationStatusBadgeProps) {
  return (
    <StatusBadge
      tone={STATUS_TONE[status]}
      size="xs"
      data-testid="period-reconciliation-status-badge"
    >
      {formatPeriodReconciliationStatusLabel(status)}
    </StatusBadge>
  )
}
