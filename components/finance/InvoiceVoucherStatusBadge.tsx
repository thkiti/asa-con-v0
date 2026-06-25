import type { InvoiceVoucherStatusCode } from "@/lib/finance-ui/invoice-voucher-display"
import { formatInvoiceVoucherStatusLabel } from "@/lib/finance-ui/invoice-voucher-display"

const toneClasses: Record<InvoiceVoucherStatusCode, string> = {
  DRAFT: "bg-zinc-100 text-zinc-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-indigo-100 text-indigo-800",
  POSTED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
}

type InvoiceVoucherStatusBadgeProps = {
  status: InvoiceVoucherStatusCode
}

export function InvoiceVoucherStatusBadge({
  status,
}: InvoiceVoucherStatusBadgeProps) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${toneClasses[status]}`}
      data-testid="invoice-voucher-status-badge"
    >
      {formatInvoiceVoucherStatusLabel(status)}
    </span>
  )
}
