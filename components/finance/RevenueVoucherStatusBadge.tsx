import { StatusBadge, type StatusBadgeTone } from "@/components/ui/StatusBadge"
import type { RevenueVoucherStatusCode } from "@/lib/finance-ui/revenue-voucher-display"
import { formatRevenueVoucherStatusLabel } from "@/lib/finance-ui/revenue-voucher-display"

const STATUS_TONE: Record<RevenueVoucherStatusCode, StatusBadgeTone> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  CONFIRMED: "accent",
  POSTED: "success",
  CANCELLED: "danger",
}

type RevenueVoucherStatusBadgeProps = {
  status: RevenueVoucherStatusCode
}

export function RevenueVoucherStatusBadge({
  status,
}: RevenueVoucherStatusBadgeProps) {
  return (
    <StatusBadge
      tone={STATUS_TONE[status]}
      size="xs"
      data-testid="revenue-voucher-status-badge"
    >
      {formatRevenueVoucherStatusLabel(status)}
    </StatusBadge>
  )
}
