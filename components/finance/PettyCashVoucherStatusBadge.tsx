import { StatusBadge, type StatusBadgeTone } from "@/components/ui/StatusBadge"
import type { PettyCashVoucherStatusCode } from "@/lib/finance-ui/petty-cash-voucher-display"
import { formatPettyCashVoucherStatusLabel } from "@/lib/finance-ui/petty-cash-voucher-display"

const STATUS_TONE: Record<PettyCashVoucherStatusCode, StatusBadgeTone> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  CONFIRMED: "accent",
  POSTED: "success",
  CANCELLED: "danger",
}

type PettyCashVoucherStatusBadgeProps = {
  status: PettyCashVoucherStatusCode
}

export function PettyCashVoucherStatusBadge({
  status,
}: PettyCashVoucherStatusBadgeProps) {
  return (
    <StatusBadge
      tone={STATUS_TONE[status]}
      size="xs"
      data-testid="petty-cash-voucher-status-badge"
    >
      {formatPettyCashVoucherStatusLabel(status)}
    </StatusBadge>
  )
}
