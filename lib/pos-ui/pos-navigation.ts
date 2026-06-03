import type { DocType } from "@/lib/stock-ui/types"

export const POS_RETURN_FROM = "shop"

export function stockDocumentNewHref(
  docType: Extract<DocType, "TRANSFER_OUT" | "ADJUSTMENT">
): string {
  const params = new URLSearchParams({
    type: docType,
    from: POS_RETURN_FROM,
  })
  return `/shop/stock-documents/new?${params.toString()}`
}

export const POS_ORDER_HREF = stockDocumentNewHref("TRANSFER_OUT")
export const POS_STOCK_COUNT_HREF = stockDocumentNewHref("ADJUSTMENT")
