import { STOCK_COUNT_STAFF_FROM } from "@/lib/stock-ui/stock-count-staff-mode"
import type { DocType } from "@/lib/stock-ui/types"

export const POS_RETURN_FROM = "shop"

export const POS_STOCK_DOCUMENTS_HREF = "/shop/stock-documents"

export function stockDocumentNewHref(
  docType: Extract<DocType, "TRANSFER_OUT" | "ADJUSTMENT">
): string {
  const params = new URLSearchParams({
    type: docType,
    from: POS_RETURN_FROM,
  })
  return `/shop/stock-documents/new?${params.toString()}`
}

/** Legacy list href — prefer get-or-create + stockCountEditorHref for STOCK COUNT. */
export const POS_STOCK_COUNT_HREF = POS_STOCK_DOCUMENTS_HREF

export function stockCountEditorHref(documentId: string): string {
  const id = String(documentId ?? "").trim()
  const params = new URLSearchParams({ from: STOCK_COUNT_STAFF_FROM })
  return `/shop/stock-documents/${encodeURIComponent(id)}?${params.toString()}`
}
