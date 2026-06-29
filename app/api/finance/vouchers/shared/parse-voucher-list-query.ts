import type {
  FinanceDocumentInquiryPdfState,
  FinanceDocumentInquiryPostingState,
} from "@/lib/finance/inquiry/finance-document-inquiry-types"

export type FinanceVoucherListQuery = {
  voucherNo?: string
  refNo?: string
  refType?: string
  periodKey?: string
  dateFrom?: Date
  dateTo?: Date
  branchId?: string
  status?: string
  postingState?: FinanceDocumentInquiryPostingState
  amountMin?: string
  amountMax?: string
  pdfState?: FinanceDocumentInquiryPdfState
  limit?: number
  offset?: number
}

export function parseFinanceVoucherListQuery(
  params: URLSearchParams
): FinanceVoucherListQuery {
  const filter: FinanceVoucherListQuery = {}

  const voucherNo = params.get("voucherNo")?.trim()
  if (voucherNo) filter.voucherNo = voucherNo

  const refNo = params.get("refNo")?.trim() ?? params.get("documentNo")?.trim()
  if (refNo) filter.refNo = refNo

  const refType = params.get("refType")?.trim()
  if (refType) filter.refType = refType

  const periodKey = params.get("periodKey")?.trim()
  if (periodKey) filter.periodKey = periodKey

  const dateFrom = params.get("dateFrom")?.trim() ?? params.get("from")?.trim()
  if (dateFrom) filter.dateFrom = new Date(dateFrom)

  const dateTo = params.get("dateTo")?.trim() ?? params.get("to")?.trim()
  if (dateTo) filter.dateTo = new Date(dateTo)

  const branchId = params.get("branchId")?.trim()
  if (branchId) filter.branchId = branchId

  const status = params.get("status")?.trim()
  if (status) filter.status = status

  const postingState = params.get("postingState")?.trim()
  if (
    postingState === "all" ||
    postingState === "posted" ||
    postingState === "unposted"
  ) {
    filter.postingState = postingState
  }

  const amountMin = params.get("amountMin")?.trim()
  if (amountMin) filter.amountMin = amountMin

  const amountMax = params.get("amountMax")?.trim()
  if (amountMax) filter.amountMax = amountMax

  const pdfState = params.get("pdfState")?.trim()
  if (pdfState === "has" || pdfState === "missing") {
    filter.pdfState = pdfState
  }

  const limit = params.get("limit")
  if (limit) filter.limit = Number(limit)

  const offset = params.get("offset")
  if (offset) filter.offset = Number(offset)

  return filter
}
