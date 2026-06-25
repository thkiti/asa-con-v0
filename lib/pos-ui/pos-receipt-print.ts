export function posReceiptPrintUrl(saleId: string): string {
  return `/shop/receipt/${encodeURIComponent(saleId)}?autoprint=1`
}

function resolveWindowOpen(openFn?: typeof window.open): typeof window.open | undefined {
  if (openFn) return openFn
  if (typeof window === "undefined") return undefined
  return window.open
}

/** Opens receipt tab; omit noopener so receipt page can detect script-opened tab via window.opener. */
export function openPosReceiptPrint(
  saleId: string,
  openFn: typeof window.open = window.open
): void {
  openFn(posReceiptPrintUrl(saleId), "_blank")
}

/** Open a blank tab synchronously on user gesture before async checkout. */
export function openPosReceiptPrintTab(openFn?: typeof window.open): Window | null {
  const open = resolveWindowOpen(openFn)
  if (!open) return null
  return open("about:blank", "_blank")
}

/** Navigate a pre-opened tab after checkout succeeds, or fall back to a fresh print window. */
export function navigatePosReceiptPrintTab(
  saleId: string,
  printTab: Window | null | undefined,
  openFn?: typeof window.open
): void {
  const url = posReceiptPrintUrl(saleId)
  if (printTab && !printTab.closed) {
    printTab.location.href = url
    return
  }
  const open = resolveWindowOpen(openFn)
  if (open) {
    open(url, "_blank")
  }
}
