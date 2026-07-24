import { StatusBadge, type StatusBadgeTone } from "@/components/ui/StatusBadge"
import {
  formatCloseReadinessStatusLabel,
  type CloseReadinessResult,
} from "@/lib/finance-ui/close-readiness"

const STATUS_TONE: Record<CloseReadinessResult["status"], StatusBadgeTone> = {
  READY: "ok",
  WARNING: "warning",
  BLOCKED: "danger",
}

type CloseReadinessStatusBadgeProps = {
  status: CloseReadinessResult["status"]
}

export function CloseReadinessStatusBadge({ status }: CloseReadinessStatusBadgeProps) {
  return (
    <StatusBadge tone={STATUS_TONE[status]} size="sm">
      {formatCloseReadinessStatusLabel(status)}
    </StatusBadge>
  )
}
