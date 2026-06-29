import type { FinanceVoucherInquiryFilter } from "@/lib/finance-ui/types"

/** Display value for the combined inquiry "No" filter field. */
export function resolveVoucherInquiryNoDisplay(
  filter: FinanceVoucherInquiryFilter
): string {
  return (
    filter.documentNo?.trim() ??
    filter.refNo?.trim() ??
    filter.voucherNo?.trim() ??
    ""
  )
}

/**
 * Map combined "No" input to document or voucher search params.
 * V-prefixed or digit-only values → voucher no; otherwise → document no.
 */
export function splitVoucherInquiryNoFilter(inquiryNo: string | undefined): Pick<
  FinanceVoucherInquiryFilter,
  "documentNo" | "refNo" | "voucherNo"
> {
  const trimmed = inquiryNo?.trim()
  if (!trimmed) return {}

  if (/^V-/i.test(trimmed) || /^\d+$/.test(trimmed)) {
    return { voucherNo: trimmed }
  }

  return { documentNo: trimmed, refNo: trimmed }
}

export function applyVoucherInquiryNoToFilter(
  filter: FinanceVoucherInquiryFilter,
  inquiryNo: string | undefined
): FinanceVoucherInquiryFilter {
  const { documentNo: _documentNo, refNo: _refNo, voucherNo: _voucherNo, ...rest } =
    filter
  return { ...rest, ...splitVoucherInquiryNoFilter(inquiryNo) }
}
