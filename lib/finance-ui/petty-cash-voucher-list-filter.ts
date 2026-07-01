import type { PettyCashVoucherStatusCode } from "@/lib/finance-ui/petty-cash-voucher-display"
import type { PettyCashVoucherListFilterInput } from "@/lib/finance-ui/petty-cash-vouchers"
import { resolveManualJournalListDateRange } from "@/lib/finance-ui/manual-journal-entry-list-filter"

export type PettyCashVoucherPostingStateFilter = "all" | "posted" | "unposted"

export type PettyCashVoucherListUiFilter = {
  periodKey: string
  entryNo: string
  status: string
  postingState: PettyCashVoucherPostingStateFilter
  dateFrom: string
  dateTo: string
}

const ALL = ""

export function defaultPettyCashVoucherListUiFilter(): PettyCashVoucherListUiFilter {
  return {
    periodKey: "",
    entryNo: "",
    status: ALL,
    postingState: "all",
    dateFrom: "",
    dateTo: "",
  }
}

export function toPettyCashVoucherListFilter(
  filter: PettyCashVoucherListUiFilter
): PettyCashVoucherListFilterInput {
  const dates = resolveManualJournalListDateRange({
    periodKey: filter.periodKey,
    dateFrom: filter.dateFrom,
    dateTo: filter.dateTo,
  })

  return {
    ...(filter.status
      ? { status: filter.status as PettyCashVoucherStatusCode }
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
