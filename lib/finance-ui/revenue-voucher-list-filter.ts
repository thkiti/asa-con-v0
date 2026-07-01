import type { RevenueVoucherStatusCode } from "@/lib/finance-ui/revenue-voucher-display"
import type { RevenueVoucherListFilterInput } from "@/lib/finance-ui/revenue-vouchers"
import { resolveManualJournalListDateRange } from "@/lib/finance-ui/manual-journal-entry-list-filter"

export type RevenueVoucherPostingStateFilter = "all" | "posted" | "unposted"

export type RevenueVoucherListUiFilter = {
  periodKey: string
  entryNo: string
  status: string
  postingState: RevenueVoucherPostingStateFilter
  dateFrom: string
  dateTo: string
}

const ALL = ""

export function defaultRevenueVoucherListUiFilter(): RevenueVoucherListUiFilter {
  return {
    periodKey: "",
    entryNo: "",
    status: ALL,
    postingState: "all",
    dateFrom: "",
    dateTo: "",
  }
}

export function toRevenueVoucherListFilter(
  filter: RevenueVoucherListUiFilter
): RevenueVoucherListFilterInput {
  const dates = resolveManualJournalListDateRange({
    periodKey: filter.periodKey,
    dateFrom: filter.dateFrom,
    dateTo: filter.dateTo,
  })

  return {
    ...(filter.status
      ? { status: filter.status as RevenueVoucherStatusCode }
      : {}),
    ...(filter.entryNo.trim() ? { search: filter.entryNo.trim() } : {}),
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
