import type {
  ManualJournalEntryStatusCode,
  ManualJournalEntryTypeCode,
} from "@/lib/finance-ui/manual-journal-entry-display"
import type { ManualJournalEntryListFilterInput } from "@/lib/finance-ui/manual-journal-entries"

export type ManualJournalEntryPostingStateFilter = "all" | "posted" | "unposted"

export type ManualJournalEntryListUiFilter = {
  periodKey: string
  status: string
  entryType: string
  entryNo: string
  postingState: ManualJournalEntryPostingStateFilter
  dateFrom: string
  dateTo: string
}

const ALL = ""

export function defaultManualJournalEntryListUiFilter(): ManualJournalEntryListUiFilter {
  return {
    periodKey: "",
    status: ALL,
    entryType: ALL,
    entryNo: "",
    postingState: "all",
    dateFrom: "",
    dateTo: "",
  }
}

export function resolveManualJournalListDateRange(input: {
  periodKey: string
  dateFrom: string
  dateTo: string
}): { dateFrom?: string; dateTo?: string } {
  const from = input.dateFrom.trim()
  const to = input.dateTo.trim()
  if (from || to) {
    return {
      ...(from ? { dateFrom: from } : {}),
      ...(to ? { dateTo: to } : {}),
    }
  }

  const period = input.periodKey.trim()
  const match = /^(\d{4})-(\d{2})$/.exec(period)
  if (!match) return {}

  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return {}

  const lastDay = new Date(year, month, 0).getDate()
  return {
    dateFrom: `${match[1]}-${match[2]}-01`,
    dateTo: `${match[1]}-${match[2]}-${String(lastDay).padStart(2, "0")}`,
  }
}

export function toManualJournalEntryListFilter(
  filter: ManualJournalEntryListUiFilter
): ManualJournalEntryListFilterInput {
  const dates = resolveManualJournalListDateRange({
    periodKey: filter.periodKey,
    dateFrom: filter.dateFrom,
    dateTo: filter.dateTo,
  })

  return {
    ...(filter.status
      ? { status: filter.status as ManualJournalEntryStatusCode }
      : {}),
    ...(filter.entryType
      ? { entryType: filter.entryType as ManualJournalEntryTypeCode }
      : {}),
    ...(filter.entryNo.trim() ? { entryNo: filter.entryNo.trim() } : {}),
    ...(filter.status
      ? {}
      : filter.postingState === "posted"
        ? { postingState: "posted" as const }
        : filter.postingState === "unposted"
          ? { postingState: "unposted" as const }
          : {}),
    ...dates,
    limit: 50,
    offset: 0,
  }
}
