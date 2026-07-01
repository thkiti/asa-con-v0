import type { InvoiceVoucherStatusCode } from "@/lib/finance-ui/invoice-voucher-display"
import type { InvoiceVoucherListFilterInput } from "@/lib/finance-ui/invoice-vouchers"
import { resolveManualJournalListDateRange } from "@/lib/finance-ui/manual-journal-entry-list-filter"

export type InvoiceVoucherPostingStateFilter = "all" | "posted" | "unposted"

export type InvoiceVoucherListUiFilter = {
  periodKey: string
  entryNo: string
  status: string
  postingState: InvoiceVoucherPostingStateFilter
  dateFrom: string
  dateTo: string
}

const ALL = ""

export function defaultInvoiceVoucherListUiFilter(): InvoiceVoucherListUiFilter {
  return {
    periodKey: "",
    entryNo: "",
    status: ALL,
    postingState: "all",
    dateFrom: "",
    dateTo: "",
  }
}

export function toInvoiceVoucherListFilter(
  filter: InvoiceVoucherListUiFilter
): InvoiceVoucherListFilterInput {
  const dates = resolveManualJournalListDateRange({
    periodKey: filter.periodKey,
    dateFrom: filter.dateFrom,
    dateTo: filter.dateTo,
  })

  return {
    ...(filter.status
      ? { status: filter.status as InvoiceVoucherStatusCode }
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
