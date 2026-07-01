import type { ManualJournalEntryPdfSnapshot } from "./manual-journal-entry-pdf-snapshot-types"

/** Render PDF bytes from frozen POST-time snapshot using canonical print layout. */
export async function renderManualJournalEntryPdf(
  snapshot: ManualJournalEntryPdfSnapshot
): Promise<Buffer> {
  const [{ buildManualJournalEntryPdfDocumentHtml }, { renderFinanceVoucherPrintHtmlToPdf }] =
    await Promise.all([
      import("./manual-journal-entry-pdf-document-html"),
      import("@/lib/finance/finance-voucher-html-pdf"),
    ])

  const html = await buildManualJournalEntryPdfDocumentHtml({ snapshot })
  return renderFinanceVoucherPrintHtmlToPdf(html)
}
