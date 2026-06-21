import type { PaymentVoucherStatusCode } from "@/lib/finance-ui/payment-voucher-display"
import { formatPaymentVoucherStatusLabel } from "@/lib/finance-ui/payment-voucher-display"

const toneClasses: Record<PaymentVoucherStatusCode, string> = {
  DRAFT: "bg-zinc-100 text-zinc-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-indigo-100 text-indigo-800",
  POSTED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
}

type PaymentVoucherStatusBadgeProps = {
  status: PaymentVoucherStatusCode
}

export function PaymentVoucherStatusBadge({
  status,
}: PaymentVoucherStatusBadgeProps) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${toneClasses[status]}`}
      data-testid="payment-voucher-status-badge"
    >
      {formatPaymentVoucherStatusLabel(status)}
    </span>
  )
}
