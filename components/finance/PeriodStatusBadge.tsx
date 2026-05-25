import { formatPeriodStatusLabel } from "@/lib/finance-ui/periods"
import type { AccountingPeriodStatus } from "@/lib/finance-ui/types"

const toneClasses: Record<AccountingPeriodStatus, string> = {
  OPEN: "bg-green-100 text-green-800",
  SOFT_CLOSED: "bg-amber-100 text-amber-800",
  HARD_CLOSED: "bg-red-100 text-red-800",
}

type PeriodStatusBadgeProps = {
  status: AccountingPeriodStatus
}

export function PeriodStatusBadge({ status }: PeriodStatusBadgeProps) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-sm font-medium ${toneClasses[status]}`}
    >
      {formatPeriodStatusLabel(status)}
    </span>
  )
}
