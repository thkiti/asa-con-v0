import {
  formatCloseReadinessStatusLabel,
  type CloseReadinessResult,
} from "@/lib/finance-ui/close-readiness"

const toneClasses: Record<CloseReadinessResult["status"], string> = {
  READY: "bg-green-100 text-green-800",
  WARNING: "bg-amber-100 text-amber-800",
  BLOCKED: "bg-red-100 text-red-800",
}

type CloseReadinessStatusBadgeProps = {
  status: CloseReadinessResult["status"]
}

export function CloseReadinessStatusBadge({ status }: CloseReadinessStatusBadgeProps) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-sm font-medium ${toneClasses[status]}`}
    >
      {formatCloseReadinessStatusLabel(status)}
    </span>
  )
}