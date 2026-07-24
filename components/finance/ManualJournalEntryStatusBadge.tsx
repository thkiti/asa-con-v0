import { StatusBadge, type StatusBadgeTone } from "@/components/ui/StatusBadge"
import type { ManualJournalEntryStatusCode } from "@/lib/finance-ui/manual-journal-entry-display"
import { formatManualJournalEntryStatusLabel } from "@/lib/finance-ui/manual-journal-entry-display"

const STATUS_TONE: Record<ManualJournalEntryStatusCode, StatusBadgeTone> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  CONFIRMED: "accent",
  POSTED: "success",
  CANCELLED: "danger",
}

type ManualJournalEntryStatusBadgeProps = {
  status: ManualJournalEntryStatusCode
}

export function ManualJournalEntryStatusBadge({
  status,
}: ManualJournalEntryStatusBadgeProps) {
  return (
    <StatusBadge
      tone={STATUS_TONE[status]}
      size="xs"
      data-testid="manual-journal-entry-status-badge"
    >
      {formatManualJournalEntryStatusLabel(status)}
    </StatusBadge>
  )
}
