/**
 * Injected during finance voucher browser print only.
 * Finance Print Page Identity: native @page @bottom-center counters only.
 * No content-flow counters — browser pagination remains authoritative.
 */
export function buildFinanceVoucherPrintPageCss(): string {
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
