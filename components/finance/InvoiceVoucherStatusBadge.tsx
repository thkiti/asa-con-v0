import { StatusBadge, type StatusBadgeTone } from "@/components/ui/StatusBadge"
import type { InvoiceVoucherStatusCode } from "@/lib/finance-ui/invoice-voucher-display"
import { formatInvoiceVoucherStatusLabel } from "@/lib/finance-ui/invoice-voucher-display"

const STATUS_TONE: Record<InvoiceVoucherStatusCode, StatusBadgeTone> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  CONFIRMED: "accent",
  POSTED: "success",
  CANCELLED: "danger",
}

type InvoiceVoucherStatusBadgeProps = {
  status: InvoiceVoucherStatusCode
}

export function InvoiceVoucherStatusBadge({
  status,
}: InvoiceVoucherStatusBadgeProps) {
  return (
    <StatusBadge
      tone={STATUS_TONE[status]}
      size="xs"
      data-testid="invoice-voucher-status-badge"
    >
      {formatInvoiceVoucherStatusLabel(status)}
    </StatusBadge>
  )
}
