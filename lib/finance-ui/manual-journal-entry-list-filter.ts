import type {
  ManualJournalEntryStatusCode,
  ManualJournalEntryTypeCode,
} from "@/lib/finance-ui/manual-journal-entry-display"
import type { ManualJournalEntryListFilterInput } from "@/lib/finance-ui/manual-journal-entries"
import { periodKeyToDateRange, resolveAccountingPeriodKeyFilter } from "@/lib/finance/period-key"

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

  const period = resolveAccountingPeriodKeyFilter(input.periodKey)
  if (!period) return {}

  const range = periodKeyToDateRange(period)
  if (!range) return {}

  return {
    dateFrom: range.from,
    dateTo: range.to,
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
