import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import { printCollectorTicket } from "@/lib/pos-ui/print-collector-ticket"
import { printThermalSlipClone, thermalPrintSourceSelector } from "@/lib/thermal/print-dom"

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
  return printThermalSlipClone(thermalPrintSourceSelector("read-z"))
}

/** READ Z end-of-day: print thermal slip then close the report overlay. */
export function printReadZReportAndExit(
  report: ReadReportPayload | null,
  onExit: () => void
): boolean {
  if (!report || report.mode !== "Z") return false
  if (!printPosReadReport(report)) return false
  onExit()
  return true
}

/** @deprecated READ Z now uses thermal clone print */
export const POS_READ_REPORT_PRINT_STYLES = ""
