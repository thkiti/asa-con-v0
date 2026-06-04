export function posReceiptPrintUrl(saleId: string): string {
  return `/shop/receipt/${encodeURIComponent(saleId)}?autoprint=1`
}

/** Opens receipt tab; omit noopener so receipt page can detect script-opened tab via window.opener. */
export function openPosReceiptPrint(saleId: string, openFn: typeof window.open = window.open): void {
  openFn(posReceiptPrintUrl(saleId), "_blank")
}
