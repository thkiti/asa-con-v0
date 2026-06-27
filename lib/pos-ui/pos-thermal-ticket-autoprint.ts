import { printThermalSlipClone, thermalPrintSourceSelector } from "@/lib/thermal/print-dom"
import { isReceiptTabOpenedByScript } from "./pos-receipt-autoprint"

export type SetupThermalTicketAutoprintOptions = {
  autoPrint: boolean
  printSourceKind: string
  win?: Window
  printDelayMs?: number
  onShowCloseHint?: () => void
}

/**
 * Autoprint thermal ticket via clone path (80mm / 72mm / 0.91 scale).
 * Same print pipeline as Receipt Setup Print Sample.
 */
export function setupThermalTicketAutoprint(
  options: SetupThermalTicketAutoprintOptions
): () => void {
  if (!options.autoPrint) {
    return () => {}
  }

  const win = options.win ?? window

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
    printThermalSlipClone(thermalPrintSourceSelector(options.printSourceKind))
  }, options.printDelayMs ?? 300)

  return () => {
    win.clearTimeout(printId)
    win.onafterprint = null
    win.removeEventListener("afterprint", onAfterPrint)
  }
}
