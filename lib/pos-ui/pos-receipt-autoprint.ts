export const POS_RECEIPT_CLOSE_HINT = "You may close this tab"

/** True when this window was opened from POS via window.open (has opener). */
export function isReceiptTabOpenedByScript(win: Window = window): boolean {
  return win.opener != null
}

export type SetupReceiptAutoprintOptions = {
  autoPrint: boolean
  win?: Window
  printDelayMs?: number
  onShowCloseHint?: () => void
}

/**
 * Autoprint receipt slip and close tab after print when opened by window.open().
 * Returns a cleanup function for the caller to run on unmount.
 */
export function setupReceiptAutoprint(options: SetupReceiptAutoprintOptions): () => void {
  const win = options.win ?? window
  if (!options.autoPrint) {
    return () => {}
  }

  const shouldAutoClose = isReceiptTabOpenedByScript(win)
  let hintShown = false

  const showCloseHint = () => {
    if (hintShown) return
    hintShown = true
    options.onShowCloseHint?.()
  }

  const tryCloseTab = () => {
    if (!shouldAutoClose) return
    win.close()
    win.setTimeout(() => {
      try {
        if (!win.closed) {
          showCloseHint()
        }
      } catch {
        showCloseHint()
      }
    }, 300)
  }

  const onAfterPrint = () => {
    tryCloseTab()
  }

  win.onafterprint = onAfterPrint
  win.addEventListener("afterprint", onAfterPrint)

  const printId = win.setTimeout(() => {
    win.print()
  }, options.printDelayMs ?? 300)

  return () => {
    win.clearTimeout(printId)
    win.onafterprint = null
    win.removeEventListener("afterprint", onAfterPrint)
  }
}
