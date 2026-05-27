import type { ReconciliationRowStatus } from "@/lib/finance-ui/reconciliation"

const toneClasses: Record<ReconciliationRowStatus, string> = {
  MATCHED: "bg-green-100 text-green-800",
  VARIANCE: "bg-amber-100 text-amber-800",
  MISSING_SOURCE: "bg-orange-100 text-orange-900",
  MISSING_GL: "bg-red-100 text-red-800",
}

type ReconciliationStatusBadgeProps = {
  status: ReconciliationRowStatus
}

export function ReconciliationStatusBadge({
  status,
}: ReconciliationStatusBadgeProps) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${toneClasses[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  )
}
