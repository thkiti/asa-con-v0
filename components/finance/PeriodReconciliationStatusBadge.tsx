import type { PeriodReconciliationStatus } from "@/generated/prisma/client"
import { formatPeriodReconciliationStatusLabel } from "@/lib/finance-ui/bank-reconciliation"

const toneClasses: Record<PeriodReconciliationStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  LOCKED: "bg-slate-200 text-slate-900",
}

type PeriodReconciliationStatusBadgeProps = {
  status: PeriodReconciliationStatus
}

export function PeriodReconciliationStatusBadge({
  status,
}: PeriodReconciliationStatusBadgeProps) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${toneClasses[status]}`}
      data-testid="period-reconciliation-status-badge"
    >
      {formatPeriodReconciliationStatusLabel(status)}
    </span>
  )
}
