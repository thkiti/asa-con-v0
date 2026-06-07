import type { ReadReportPayload } from "@/lib/pos/read-report-types"

const PRINT_BODY_CLASS = "printing-collector-ticket"

let printClone: HTMLElement | null = null

function removePrintClone(): void {
  printClone?.remove()
  printClone = null
}

export function canPrintCollectorTicket(
  report: ReadReportPayload | null
): report is ReadReportPayload {
  return report?.mode === "COLLECT"
}

/** Print on-screen COLLECT ticket — clone DOM, no fetch, no recompute. */
export function printCollectorTicket(report: ReadReportPayload | null): boolean {
  if (!canPrintCollectorTicket(report)) return false

  const source = document.querySelector<HTMLElement>(
    "[data-collector-ticket-print-source]"
  )
  if (!source) return false

  removePrintClone()
  const clone = source.cloneNode(true) as HTMLElement
  clone.setAttribute("data-collector-ticket-print-clone", "")
  printClone = clone
  document.body.appendChild(clone)

  const onAfter = () => {
    cleanupCollectorTicketPrint()
    window.removeEventListener("afterprint", onAfter)
  }
  window.addEventListener("afterprint", onAfter)

  document.body.classList.add(PRINT_BODY_CLASS)
  window.print()
  return true
}

export function cleanupCollectorTicketPrint(): void {
  document.body.classList.remove(PRINT_BODY_CLASS)
  removePrintClone()
}

export const COLLECTOR_TICKET_PRINT_STYLES = `
@media print {
  body.printing-collector-ticket {
    background: white !important;
  }

  body.printing-collector-ticket * {
    display: none !important;
  }

  body.printing-collector-ticket .collector-ticket-print-area,
  body.printing-collector-ticket .collector-ticket-print-area * {
    display: block !important;
    visibility: visible !important;
    font-family: "Courier New", Courier, monospace !important;
    font-size: 12px !important;
    font-weight: bold !important;
    line-height: 1.25 !important;
  }

  body.printing-collector-ticket .collector-ticket-print-area pre {
    white-space: pre !important;
  }

  body.printing-collector-ticket .collector-ticket-print-area {
    box-sizing: content-box !important;
    position: fixed !important;
    left: 2mm !important;
    top: 0 !important;
    width: var(--receipt-slip-ch-width, 30ch) !important;
    max-width: var(--receipt-slip-ch-width, 30ch) !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
    color: #111 !important;
    z-index: 2147483647 !important;
    overflow: visible !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body.printing-collector-ticket .collector-ticket-signature-space {
    display: block !important;
    height: 50mm !important;
    min-height: 50mm !important;
  }

  body.printing-collector-ticket .no-print {
    display: none !important;
  }
}
`
