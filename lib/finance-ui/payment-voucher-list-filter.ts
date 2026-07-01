import type { PaymentVoucherStatusCode } from "@/lib/finance-ui/payment-voucher-display"
import type { PaymentVoucherListFilterInput } from "@/lib/finance-ui/payment-vouchers"
import { resolveManualJournalListDateRange } from "@/lib/finance-ui/manual-journal-entry-list-filter"

export type PaymentVoucherPostingStateFilter = "all" | "posted" | "unposted"

export type PaymentVoucherListUiFilter = {
  periodKey: string
  entryNo: string
  status: string
  postingState: PaymentVoucherPostingStateFilter
  dateFrom: string
  dateTo: string
}

const ALL = ""

export function defaultPaymentVoucherListUiFilter(): PaymentVoucherListUiFilter {
  return {
    periodKey: "",
    entryNo: "",
    status: ALL,
    postingState: "all",
    dateFrom: "",
    dateTo: "",
  }
}

export function toPaymentVoucherListFilter(
  filter: PaymentVoucherListUiFilter
): PaymentVoucherListFilterInput {
  const dates = resolveManualJournalListDateRange({
    periodKey: filter.periodKey,
    dateFrom: filter.dateFrom,
    dateTo: filter.dateTo,
  })

  return {
    ...(filter.status
      ? { status: filter.status as PaymentVoucherStatusCode }
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
