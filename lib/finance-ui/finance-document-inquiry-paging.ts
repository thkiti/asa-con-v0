import type { FinanceVoucherInquiryFilter } from "@/lib/finance-ui/types"

export const FINANCE_DOCUMENT_INQUIRY_PAGE_SIZE = 50

export function resolveFinanceDocumentInquiryPage(
  filter: Pick<FinanceVoucherInquiryFilter, "limit" | "offset">,
  total: number
): {
  page: number
  pageSize: number
  totalPages: number
  offset: number
} {
  const pageSize = Math.min(
    Math.max(
      Number(filter.limit ?? FINANCE_DOCUMENT_INQUIRY_PAGE_SIZE) ||
        FINANCE_DOCUMENT_INQUIRY_PAGE_SIZE,
      1
    ),
    200
  )
  const offset = Math.max(Number(filter.offset ?? 0) || 0, 0)
  const page = Math.floor(offset / pageSize) + 1
  const totalPages = Math.max(1, Math.ceil(Math.max(total, 0) / pageSize))
  return { page, pageSize, totalPages, offset }
}

export function withFinanceDocumentInquiryPage(
  filter: FinanceVoucherInquiryFilter,
  page: number
): FinanceVoucherInquiryFilter {
  const pageSize = Math.min(
    Math.max(
      Number(filter.limit ?? FINANCE_DOCUMENT_INQUIRY_PAGE_SIZE) ||
        FINANCE_DOCUMENT_INQUIRY_PAGE_SIZE,
      1
    ),
    200
  )
  const safePage = Math.max(1, Math.trunc(page) || 1)
  return {
    ...filter,
    limit: pageSize,
    offset: (safePage - 1) * pageSize,
  }
}

export function resetFinanceDocumentInquiryPage(
  filter: FinanceVoucherInquiryFilter
): FinanceVoucherInquiryFilter {
  return withFinanceDocumentInquiryPage(filter, 1)
}

export function formatFinanceDocumentInquiryPageSummary(
  total: number,
  page: number,
  totalPages: number
): string {
  return `${total} รายการ • หน้า ${page} / ${totalPages}`
}
