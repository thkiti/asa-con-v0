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

/** STOCK COUNT navigates to the stock document list. */
export const POS_STOCK_COUNT_HREF = POS_STOCK_DOCUMENTS_HREF
