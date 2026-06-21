import type { PettyCashVoucherStatusCode } from "@/lib/finance-ui/petty-cash-voucher-display"
import { formatPettyCashVoucherStatusLabel } from "@/lib/finance-ui/petty-cash-voucher-display"

const toneClasses: Record<PettyCashVoucherStatusCode, string> = {
  DRAFT: "bg-zinc-100 text-zinc-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-indigo-100 text-indigo-800",
  POSTED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
}

type PettyCashVoucherStatusBadgeProps = {
  status: PettyCashVoucherStatusCode
}

export function PettyCashVoucherStatusBadge({
  status,
}: PettyCashVoucherStatusBadgeProps) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${toneClasses[status]}`}
      data-testid="petty-cash-voucher-status-badge"
    >
      {formatPettyCashVoucherStatusLabel(status)}
    </span>
  )
}
