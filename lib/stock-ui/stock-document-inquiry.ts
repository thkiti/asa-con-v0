import type { DocStatus } from "@/generated/prisma/client"
import type {
  StockDocumentInquiryDetail,
  StockDocumentInquiryKindFilter,
  StockDocumentInquiryPostingState,
  StockDocumentInquiryResult,
  StockDocumentInquiryRow,
} from "@/lib/stock/inquiry/stock-document-inquiry-types"

export type {
  StockDocumentInquiryDetail,
  StockDocumentInquiryKindFilter,
  StockDocumentInquiryPostingState,
  StockDocumentInquiryResult,
  StockDocumentInquiryRow,
}

export type StockDocumentInquiryFilter = {
  branchId?: string
  periodKey?: string
  from?: string
  to?: string
  kind?: StockDocumentInquiryKindFilter
  refNo?: string
  documentNo?: string
  status?: DocStatus
  postingState?: StockDocumentInquiryPostingState
  limit?: number
  offset?: number
}

export const STOCK_DOCUMENT_INQUIRY_PATH = "/finance/stock-documents"

export function parseStockDocumentInquiryFilterFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">
): StockDocumentInquiryFilter {
  const filter: StockDocumentInquiryFilter = {}

  const branchId = searchParams.get("branchId")?.trim()
  if (branchId) filter.branchId = branchId

  const periodKey = searchParams.get("periodKey")?.trim()
  if (periodKey) filter.periodKey = periodKey

  const from = searchParams.get("from")?.trim()
  if (from) filter.from = from

  const to = searchParams.get("to")?.trim()
  if (to) filter.to = to

  const kind = searchParams.get("kind")?.trim() ?? searchParams.get("docType")?.trim()
  if (kind) filter.kind = kind.toUpperCase() as StockDocumentInquiryKindFilter

  const refNo =
    searchParams.get("refNo")?.trim() ?? searchParams.get("documentNo")?.trim()
  if (refNo) {
    filter.refNo = refNo
    filter.documentNo = refNo
  }

  const status = searchParams.get("status")?.trim()
  if (status) filter.status = status as DocStatus

  const postingState = searchParams.get("postingState")?.trim()
  if (
    postingState === "all" ||
    postingState === "posted" ||
    postingState === "unposted"
  ) {
    filter.postingState = postingState
  }

  const limit = searchParams.get("limit")
  if (limit) filter.limit = Number(limit)

  const offset = searchParams.get("offset")
  if (offset) filter.offset = Number(offset)

  return filter
}

export function buildStockDocumentInquirySearchParams(
  filter: StockDocumentInquiryFilter
): URLSearchParams {
  const params = new URLSearchParams()
  if (filter.branchId?.trim()) params.set("branchId", filter.branchId.trim())
  if (filter.periodKey?.trim()) params.set("periodKey", filter.periodKey.trim())
  if (filter.from?.trim()) params.set("from", filter.from.trim())
  if (filter.to?.trim()) params.set("to", filter.to.trim())
  if (filter.kind) params.set("kind", filter.kind)
  const documentNo = filter.documentNo?.trim() ?? filter.refNo?.trim()
  if (documentNo) params.set("documentNo", documentNo)
  if (filter.status) params.set("status", filter.status)
  if (filter.postingState) params.set("postingState", filter.postingState)
  if (filter.limit != null) params.set("limit", String(filter.limit))
  if (filter.offset != null) params.set("offset", String(filter.offset))
  return params
}

export function buildStockDocumentInquiryReturnPath(
  filter: StockDocumentInquiryFilter
): string {
  const query = buildStockDocumentInquirySearchParams(filter).toString()
  return query
    ? `${STOCK_DOCUMENT_INQUIRY_PATH}?${query}`
    : STOCK_DOCUMENT_INQUIRY_PATH
}

function buildStockDocumentInquiryQuery(filter: StockDocumentInquiryFilter): string {
  const params = buildStockDocumentInquirySearchParams(filter)
  const query = params.toString()
  return query ? `?${query}` : ""
}

export async function fetchStockDocumentsForInquiry(
  filter: StockDocumentInquiryFilter
): Promise<StockDocumentInquiryResult> {
  const query = buildStockDocumentInquiryQuery(filter)
  const res = await fetch(`/api/finance/stock-documents${query}`)
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
  return res.json() as Promise<StockDocumentInquiryResult>
}

export async function fetchStockDocumentInquiryDetail(
  documentId: string
): Promise<StockDocumentInquiryDetail> {
  const res = await fetch(`/api/finance/stock-documents/${documentId}`)
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
  return res.json() as Promise<StockDocumentInquiryDetail>
}

export function resolveStockDocumentInquiryNoDisplay(
  filter: StockDocumentInquiryFilter
): string {
  return filter.documentNo?.trim() ?? filter.refNo?.trim() ?? ""
}

export function applyStockDocumentInquiryNoToFilter(
  filter: StockDocumentInquiryFilter,
  inquiryNo: string
): StockDocumentInquiryFilter {
  const trimmed = inquiryNo.trim()
  if (!trimmed) {
    const next = { ...filter }
    delete next.refNo
    delete next.documentNo
    return next
  }
  return { ...filter, refNo: trimmed, documentNo: trimmed }
}
