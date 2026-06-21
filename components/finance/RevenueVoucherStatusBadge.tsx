import type { RevenueVoucherStatusCode } from "@/lib/finance-ui/revenue-voucher-display"
import { formatRevenueVoucherStatusLabel } from "@/lib/finance-ui/revenue-voucher-display"

const toneClasses: Record<RevenueVoucherStatusCode, string> = {
  DRAFT: "bg-zinc-100 text-zinc-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-indigo-100 text-indigo-800",
  POSTED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
}

type RevenueVoucherStatusBadgeProps = {
  status: RevenueVoucherStatusCode
}

export function RevenueVoucherStatusBadge({
  status,
}: RevenueVoucherStatusBadgeProps) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${toneClasses[status]}`}
      data-testid="revenue-voucher-status-badge"
    >
      {formatRevenueVoucherStatusLabel(status)}
    </span>
  )
}
