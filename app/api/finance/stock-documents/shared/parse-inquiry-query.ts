import type { DocStatus } from "@/generated/prisma/client"
import type {
  StockDocumentInquiryFilter,
  StockDocumentInquiryKindFilter,
  StockDocumentInquiryPostingState,
} from "@/lib/stock/inquiry/stock-document-inquiry-types"

const DOC_STATUSES: readonly DocStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "SHIPPED",
  "CONFIRMED",
  "RECEIVED",
  "POSTED",
  "TRANSFERRED",
  "CANCELLED",
]

const KINDS: readonly StockDocumentInquiryKindFilter[] = [
  "",
  "CNT",
  "ADJ",
  "ORD",
  "DEY",
  "ORS",
  "ORI",
]

function parseDocStatus(value: string | null): DocStatus | undefined {
  const raw = String(value ?? "").trim().toUpperCase()
  if ((DOC_STATUSES as readonly string[]).includes(raw)) {
    return raw as DocStatus
  }
  return undefined
}

function parseKind(value: string | null): StockDocumentInquiryKindFilter | undefined {
  const raw = String(value ?? "").trim().toUpperCase()
  if ((KINDS as readonly string[]).includes(raw)) {
    return raw as StockDocumentInquiryKindFilter
  }
  return undefined
}

function parsePostingState(
  value: string | null
): StockDocumentInquiryPostingState | undefined {
  const raw = String(value ?? "").trim().toLowerCase()
  if (raw === "all" || raw === "posted" || raw === "unposted") {
    return raw
  }
  return undefined
}

export function parseStockDocumentInquiryQuery(
  params: URLSearchParams
): Omit<StockDocumentInquiryFilter, "legalEntityCode"> {
  const filter: Omit<StockDocumentInquiryFilter, "legalEntityCode"> = {}

  const branchId = params.get("branchId")?.trim()
  if (branchId) filter.branchId = branchId

  const periodKey = params.get("periodKey")?.trim()
  if (periodKey) filter.periodKey = periodKey

  const from = params.get("from")?.trim()
  if (from) filter.dateFrom = from

  const to = params.get("to")?.trim()
  if (to) filter.dateTo = to

  const kind = parseKind(params.get("kind") ?? params.get("docType"))
  if (kind) filter.kind = kind

  const refNo = params.get("refNo")?.trim() ?? params.get("documentNo")?.trim()
  if (refNo) filter.refNo = refNo

  const status = parseDocStatus(params.get("status"))
  if (status) filter.status = status

  const postingState = parsePostingState(params.get("postingState"))
  if (postingState) filter.postingState = postingState

  const limit = params.get("limit")
  if (limit) filter.limit = Number(limit)

  const offset = params.get("offset")
  if (offset) filter.offset = Number(offset)

  return filter
}
