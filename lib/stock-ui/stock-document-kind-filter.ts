import type { DocStatus, DocType } from "./types"
import type { StockDocumentListFilter } from "./types"
import {
  getStockDocumentTypesForEntity,
  matchesStockDocumentKindFilter as matchesKindPolicy,
  stockDocumentKindToListQuery as kindToQueryPolicy,
  type StockDocumentKindFilter,
} from "@/lib/stock/document-read/stock-document-entity-policy"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"

export type { StockDocumentKindFilter }

/** @deprecated Prefer getStockDocumentTypesForEntity(entityCode) */
export const STOCK_DOCUMENT_KIND_FILTER_OPTIONS: ReadonlyArray<{
  value: StockDocumentKindFilter
  label: string
}> = getStockDocumentTypesForEntity(DEFAULT_DOCUMENT_ENTITY_CODE)

export function getStockDocumentKindFilterOptions(
  entityCode: DocumentEntityCode
): ReadonlyArray<{ value: StockDocumentKindFilter; label: string }> {
  return getStockDocumentTypesForEntity(entityCode)
}

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

/**
 * Map UI kind + status to list API query fields.
 * CNT implies ADJUSTMENT draft; ADJ implies ADJUSTMENT non-draft when status is All.
 */
export function stockDocumentKindToListQuery(
  kind: StockDocumentKindFilter,
  status: "" | DocStatus
): Pick<StockDocumentListFilter, "docType" | "status"> {
  return kindToQueryPolicy(kind, status) as Pick<
    StockDocumentListFilter,
    "docType" | "status"
  >
}

/** Refine API rows when kind/status cannot be expressed fully in one query. */
export function matchesStockDocumentKindFilter(
  kind: StockDocumentKindFilter,
  status: "" | DocStatus,
  row: { docType: DocType; status: DocStatus }
): boolean {
  return matchesKindPolicy(kind, status, row)
}
