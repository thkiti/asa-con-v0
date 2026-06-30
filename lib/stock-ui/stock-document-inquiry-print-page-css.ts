/** Injected during stock document inquiry browser print only. */
export function buildStockDocumentInquiryPrintPageCss(): string {
  return `@media print {
  @page {
    size: A4 portrait;
    margin: 12mm;
    @bottom-center {
      content: "Page " counter(page) " of " counter(pages);
    }
  }
}`
}
