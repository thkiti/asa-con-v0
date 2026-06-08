import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import { printThermalSlipClone, cleanupThermalClonePrint, thermalPrintSourceSelector } from "@/lib/thermal/print-dom"

export function canPrintCollectorTicket(
  report: ReadReportPayload | null
): report is ReadReportPayload {
  return report?.mode === "COLLECT"
}

/** Print on-screen COLLECT ticket — clone DOM, no fetch, no recompute. */
export function printCollectorTicket(report: ReadReportPayload | null): boolean {
  if (!canPrintCollectorTicket(report)) return false
  return printThermalSlipClone(thermalPrintSourceSelector("collector"))
}

export function cleanupCollectorTicketPrint(): void {
  cleanupThermalClonePrint()
}

export { THERMAL_CLONE_PRINT_STYLES as COLLECTOR_TICKET_PRINT_STYLES } from "@/lib/thermal/print-css"
