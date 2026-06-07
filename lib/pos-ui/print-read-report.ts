import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import { printCollectorTicket } from "@/lib/pos-ui/print-collector-ticket"

const PRINT_BODY_CLASS = "pos-read-z-print-active"

export function canPrintPosReadReport(
  report: ReadReportPayload | null
): report is ReadReportPayload {
  return report?.mode === "Z" || report?.mode === "COLLECT"
}

/** Print the on-screen report payload — no fetch, no recompute. */
export function printPosReadReport(report: ReadReportPayload | null): boolean {
  if (!canPrintPosReadReport(report)) return false
  if (report.mode === "COLLECT") {
    return printCollectorTicket(report)
  }

  const onAfter = () => {
    document.body.classList.remove(PRINT_BODY_CLASS)
    window.removeEventListener("afterprint", onAfter)
  }
  document.body.classList.add(PRINT_BODY_CLASS)
  window.addEventListener("afterprint", onAfter)
  window.print()
  return true
}

export const POS_READ_REPORT_PRINT_STYLES = `
@media print {
  body.pos-read-z-print-active .pos-terminal-root * {
    visibility: hidden !important;
  }
  body.pos-read-z-print-active .pos-read-z-print-root,
  body.pos-read-z-print-active .pos-read-z-print-root * {
    visibility: visible !important;
  }
  body.pos-read-z-print-active .pos-read-z-print-root {
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    min-height: 100% !important;
    z-index: 2147483647 !important;
    background: white !important;
    color: black !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
`
