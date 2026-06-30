export const STOCK_DOCUMENT_INQUIRY_PATH = "/finance/stock-documents"

export function buildStockDocumentInquiryPath(documentId: string): string {
  return `${STOCK_DOCUMENT_INQUIRY_PATH}/${documentId}`
}

/** Finance inquiry print URL — browser print via `?autoprint=1` on detail page. */
export function buildStockDocumentInquiryPrintPath(documentId: string): string | null {
  const id = documentId.trim()
  if (!id) return null
  return `${buildStockDocumentInquiryPath(id)}?autoprint=1`
}

export function buildStockDocumentOperationalPath(documentId: string): string {
  return `/shop/stock-documents/${documentId}`
}

export function buildStockDocumentJournalInquiryPath(
  journalEntryId: string,
  returnTo?: string | null
): string {
  const base = `/finance/journal-entries/${journalEntryId}`
  if (!returnTo?.trim()) return base
  const params = new URLSearchParams({ returnTo: returnTo.trim() })
  return `${base}?${params.toString()}`
}

export function buildStockDocumentVoucherInquiryPath(
  voucherId: string,
  returnTo?: string | null
): string {
  const base = `/finance/vouchers/${voucherId}`
  if (!returnTo?.trim()) return base
  const params = new URLSearchParams({ returnTo: returnTo.trim() })
  return `${base}?${params.toString()}`
}
