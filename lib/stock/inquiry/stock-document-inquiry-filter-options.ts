import type { DocStatus } from "@/generated/prisma/client"
import type { StockDocumentInquiryKindFilter } from "./stock-document-inquiry-types"

export const STOCK_DOCUMENT_INQUIRY_KIND_OPTIONS: ReadonlyArray<{
  value: StockDocumentInquiryKindFilter
  label: string
}> = [
  { value: "", label: "All" },
  { value: "CNT", label: "CNT" },
  { value: "ADJ", label: "ADJ" },
  { value: "ORD", label: "ORD" },
  { value: "DEY", label: "DEY" },
  { value: "ORS", label: "ORS" },
  { value: "ORI", label: "ORI" },
]

export const STOCK_DOCUMENT_INQUIRY_STATUS_OPTIONS: ReadonlyArray<{
  value: "" | DocStatus
  label: string
}> = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "RECEIVED", label: "Received" },
  { value: "POSTED", label: "Posted" },
  { value: "TRANSFERRED", label: "Transferred" },
  { value: "CANCELLED", label: "Cancelled" },
]

export const STOCK_DOCUMENT_INQUIRY_POSTING_STATE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "posted", label: "Posted" },
  { value: "unposted", label: "Unposted" },
] as const
