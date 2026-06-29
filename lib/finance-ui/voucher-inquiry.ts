import type {
  FinanceDocumentInquiryResult,
  FinanceVoucherInquiryFilter,
} from "@/lib/finance-ui/types"

export const FINANCE_VOUCHER_INQUIRY_PATH = "/finance/vouchers"

export function parseVoucherInquiryFilterFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">
): FinanceVoucherInquiryFilter {
  const filter: FinanceVoucherInquiryFilter = {}

  const voucherNo = searchParams.get("voucherNo")?.trim()
  if (voucherNo) filter.voucherNo = voucherNo

  const refNo =
    searchParams.get("refNo")?.trim() ?? searchParams.get("documentNo")?.trim()
  if (refNo) {
    filter.refNo = refNo
    filter.documentNo = refNo
  }

  const refType = searchParams.get("refType")?.trim()
  if (refType) filter.refType = refType

  const periodKey = searchParams.get("periodKey")?.trim()
  if (periodKey) filter.periodKey = periodKey

  const from = searchParams.get("from")?.trim()
  if (from) filter.from = from

  const to = searchParams.get("to")?.trim()
  if (to) filter.to = to

  const branchId = searchParams.get("branchId")?.trim()
  if (branchId) filter.branchId = branchId

  const status = searchParams.get("status")?.trim()
  if (status) filter.status = status

  const postingState = searchParams.get("postingState")?.trim()
  if (
    postingState === "all" ||
    postingState === "posted" ||
    postingState === "unposted"
  ) {
    filter.postingState = postingState
  }

  const amountMin = searchParams.get("amountMin")?.trim()
  if (amountMin) filter.amountMin = amountMin

  const amountMax = searchParams.get("amountMax")?.trim()
  if (amountMax) filter.amountMax = amountMax

  const pdfState = searchParams.get("pdfState")?.trim()
  if (pdfState === "has" || pdfState === "missing") {
    filter.pdfState = pdfState
  }

  const limit = searchParams.get("limit")
  if (limit) filter.limit = Number(limit)

  const offset = searchParams.get("offset")
  if (offset) filter.offset = Number(offset)

  return filter
}

export function buildVoucherInquirySearchParams(
  filter: FinanceVoucherInquiryFilter
): URLSearchParams {
  const params = new URLSearchParams()
  if (filter.voucherNo?.trim()) params.set("voucherNo", filter.voucherNo.trim())
  const documentNo = filter.documentNo?.trim() ?? filter.refNo?.trim()
  if (documentNo) params.set("documentNo", documentNo)
  if (filter.refType?.trim()) params.set("refType", filter.refType.trim())
  if (filter.periodKey?.trim()) params.set("periodKey", filter.periodKey.trim())
  if (filter.from?.trim()) params.set("from", filter.from.trim())
  if (filter.to?.trim()) params.set("to", filter.to.trim())
  if (filter.branchId?.trim()) params.set("branchId", filter.branchId.trim())
  if (filter.status?.trim()) params.set("status", filter.status.trim())
  if (filter.postingState) params.set("postingState", filter.postingState)
  if (filter.amountMin?.trim()) params.set("amountMin", filter.amountMin.trim())
  if (filter.amountMax?.trim()) params.set("amountMax", filter.amountMax.trim())
  if (filter.pdfState) params.set("pdfState", filter.pdfState)
  if (filter.limit != null) params.set("limit", String(filter.limit))
  if (filter.offset != null) params.set("offset", String(filter.offset))
  return params
}

export function buildVoucherInquiryReturnPath(
  filter: FinanceVoucherInquiryFilter
): string {
  const query = buildVoucherInquirySearchParams(filter).toString()
  return query ? `${FINANCE_VOUCHER_INQUIRY_PATH}?${query}` : FINANCE_VOUCHER_INQUIRY_PATH
}

function buildVoucherInquiryQuery(filter: FinanceVoucherInquiryFilter): string {
  const params = buildVoucherInquirySearchParams(filter)
  const query = params.toString()
  return query ? `?${query}` : ""
}

export async function fetchFinanceDocuments(
  filter: FinanceVoucherInquiryFilter
): Promise<FinanceDocumentInquiryResult> {
  const query = buildVoucherInquiryQuery(filter)
  const res = await fetch(`/api/finance/vouchers${query}`)
  if (!res.ok) {
    let message = res.statusText || "Request failed"
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // keep statusText
    }
    throw new Error(message)
  }
  return res.json() as Promise<FinanceDocumentInquiryResult>
}

/** @deprecated Use fetchFinanceDocuments */
export const fetchFinanceVouchers = fetchFinanceDocuments
