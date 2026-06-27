import type { ReadReportPayload } from "@/lib/pos/read-report-types"

/** Any READ Z preview mode may print — ticket matches active date/range on screen. */
export function isReadZReportPrintAllowed(report: ReadReportPayload): boolean {
  return report.mode === "Z"
}
