import type { ManualJournalEntryStatusCode } from "@/lib/finance-ui/manual-journal-entry-display"
import { formatManualJournalEntryStatusLabel } from "@/lib/finance-ui/manual-journal-entry-display"

const toneClasses: Record<ManualJournalEntryStatusCode, string> = {
  DRAFT: "bg-zinc-100 text-zinc-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-indigo-100 text-indigo-800",
  POSTED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
}

type ManualJournalEntryStatusBadgeProps = {
  status: ManualJournalEntryStatusCode
}

export function ManualJournalEntryStatusBadge({
  status,
}: ManualJournalEntryStatusBadgeProps) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${toneClasses[status]}`}
      data-testid="manual-journal-entry-status-badge"
    >
      {formatManualJournalEntryStatusLabel(status)}
    </span>
  )
}
