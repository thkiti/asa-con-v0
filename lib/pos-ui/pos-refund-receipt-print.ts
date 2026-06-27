export function posRefundReceiptPrintUrl(refundId: string): string {
  return `/shop/refund-receipt/${encodeURIComponent(refundId)}?autoprint=1`
}

function resolveWindowOpen(openFn?: typeof window.open): typeof window.open | undefined {
  if (openFn) return openFn
  if (typeof window === "undefined") return undefined
  return window.open
}

/** Opens refund receipt tab; omit noopener so page can detect script-opened tab via window.opener. */
export function openPosRefundReceiptPrint(
  refundId: string,
  openFn: typeof window.open = window.open
): void {
  openFn(posRefundReceiptPrintUrl(refundId), "_blank")
}

/** Open a blank tab synchronously on user gesture before async refund processing. */
export function openPosRefundReceiptPrintTab(openFn?: typeof window.open): Window | null {
  const open = resolveWindowOpen(openFn)
  if (!open) return null
  return open("about:blank", "_blank")
}

/** Navigate a pre-opened tab after refund succeeds, or fall back to a fresh print window. */
export function navigatePosRefundReceiptPrintTab(
  refundId: string,
  printTab: Window | null | undefined,
  openFn?: typeof window.open
): void {
  const url = posRefundReceiptPrintUrl(refundId)
  if (printTab && !printTab.closed) {
    printTab.location.href = url
    return
  }
  const open = resolveWindowOpen(openFn)
  if (open) {
    open(url, "_blank")
  }
}
