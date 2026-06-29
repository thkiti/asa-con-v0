export const STOCK_DOCUMENT_INQUIRY_PATH = "/finance/stock-documents"

export function buildStockDocumentInquiryPath(documentId: string): string {
  return `${STOCK_DOCUMENT_INQUIRY_PATH}/${documentId}`
}

/** Reserved for future print preview route — inquiry layer only. */
export function buildStockDocumentInquiryPrintPath(
  _documentId: string
): string | null {
  return null
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
