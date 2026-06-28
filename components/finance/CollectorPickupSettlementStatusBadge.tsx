import type { CollectorPickupSettlementStatus } from "@/lib/finance-ui/collector-pickup-settlement"

const toneClasses: Record<CollectorPickupSettlementStatus, string> = {
  NOT_POSTED: "bg-zinc-100 text-zinc-800",
  POSTED: "bg-green-100 text-green-800",
  VARIANCE: "bg-amber-100 text-amber-800",
  INVALID_SOURCE: "bg-orange-100 text-orange-900",
}

type CollectorPickupSettlementStatusBadgeProps = {
  status: CollectorPickupSettlementStatus
}

export function CollectorPickupSettlementStatusBadge({
  status,
}: CollectorPickupSettlementStatusBadgeProps) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${toneClasses[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  )
}
