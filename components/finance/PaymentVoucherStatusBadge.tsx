import { StatusBadge, type StatusBadgeTone } from "@/components/ui/StatusBadge"
import type { PaymentVoucherStatusCode } from "@/lib/finance-ui/payment-voucher-display"
import { formatPaymentVoucherStatusLabel } from "@/lib/finance-ui/payment-voucher-display"

const STATUS_TONE: Record<PaymentVoucherStatusCode, StatusBadgeTone> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  CONFIRMED: "accent",
  POSTED: "success",
  CANCELLED: "danger",
}

type PaymentVoucherStatusBadgeProps = {
  status: PaymentVoucherStatusCode
}

export function PaymentVoucherStatusBadge({
  status,
}: PaymentVoucherStatusBadgeProps) {
  return (
    <StatusBadge
      tone={STATUS_TONE[status]}
      size="xs"
      data-testid="payment-voucher-status-badge"
    >
      {formatPaymentVoucherStatusLabel(status)}
    </StatusBadge>
  )
}
