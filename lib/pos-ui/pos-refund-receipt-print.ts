export function posRefundReceiptPrintUrl(refundId: string): string {
  return `/shop/refund-receipt/${encodeURIComponent(refundId)}?autoprint=1`
}

/** Opens refund receipt tab; omit noopener so page can detect script-opened tab via window.opener. */
export function openPosRefundReceiptPrint(
  refundId: string,
  openFn: typeof window.open = window.open
): void {
  openFn(posRefundReceiptPrintUrl(refundId), "_blank")
}
