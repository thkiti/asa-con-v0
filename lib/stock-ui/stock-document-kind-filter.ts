import type { DocStatus, DocType } from "./types"
import type { StockDocumentListFilter } from "./types"

/** Staff-facing document kind for the list page Type filter (not entity titles). */
export type StockDocumentKindFilter = "" | "ORD" | "CNT" | "ADJ"

export const STOCK_DOCUMENT_KIND_FILTER_OPTIONS: ReadonlyArray<{
  value: StockDocumentKindFilter
  label: string
}> = [
  { value: "", label: "All" },
  { value: "ORD", label: "ORD • ใบสั่งของ" },
  { value: "CNT", label: "CNT • ตรวจนับสินค้า" },
  { value: "ADJ", label: "ADJ • ปรับปรุง" },
]

/** Statuses exposed on the Stock Document list filter (UI only). */
export const STOCK_DOCUMENT_LIST_STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: "" | DocStatus
  label: string
}> = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "RECEIVED", label: "Received" },
  { value: "POSTED", label: "Posted" },
]

type ListRow = { docType: DocType; status: DocStatus }

/**
 * Map UI kind + status to list API query fields.
 * CNT implies ADJUSTMENT draft; ADJ implies ADJUSTMENT non-draft when status is All.
 */
export function stockDocumentKindToListQuery(
  kind: StockDocumentKindFilter,
  status: "" | DocStatus
): Pick<StockDocumentListFilter, "docType" | "status"> {
  switch (kind) {
    case "ORD":
      return {
        docType: "TRANSFER_OUT",
        ...(status ? { status } : {}),
      }
    case "CNT":
      return {
        docType: "ADJUSTMENT",
        status: status || "DRAFT",
      }
    case "ADJ":
      return {
        docType: "ADJUSTMENT",
        ...(status ? { status } : {}),
      }
    default:
      return status ? { status } : {}
  }
}

/** Refine API rows when kind/status cannot be expressed fully in one query. */
export function matchesStockDocumentKindFilter(
  kind: StockDocumentKindFilter,
  status: "" | DocStatus,
  row: ListRow
): boolean {
  if (kind === "ORD") {
    return row.docType === "TRANSFER_OUT"
  }
  if (kind === "CNT") {
    if (row.docType !== "ADJUSTMENT") return false
    return status ? row.status === status : row.status === "DRAFT"
  }
  if (kind === "ADJ") {
    if (row.docType !== "ADJUSTMENT") return false
    if (status) return row.status === status
    return row.status !== "DRAFT"
  }
  return true
}
