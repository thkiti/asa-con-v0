import type { DocType } from "./types"

/** Shop list / operational detail href for a stock document row. */
export function stockDocumentOperationalHref(
  documentId: string,
  docType?: DocType | string
): string {
  const id = String(documentId ?? "").trim()
  if (docType === "END") {
    return `/shop/stock-documents/end/${encodeURIComponent(id)}`
  }
  return `/shop/stock-documents/${id}`
}
