import { StatusBadge, type StatusBadgeTone } from "@/components/ui/StatusBadge"
import { formatPeriodStatusLabel } from "@/lib/finance-ui/periods"
import type { AccountingPeriodStatus } from "@/lib/finance-ui/types"

const STATUS_TONE: Record<AccountingPeriodStatus, StatusBadgeTone> = {
  OPEN: "ok",
  SOFT_CLOSED: "warning",
  HARD_CLOSED: "danger",
}

type PeriodStatusBadgeProps = {
  status: AccountingPeriodStatus
}

export function PeriodStatusBadge({ status }: PeriodStatusBadgeProps) {
  return (
    <StatusBadge tone={STATUS_TONE[status]} size="sm">
      {formatPeriodStatusLabel(status)}
    </StatusBadge>
  )
}
