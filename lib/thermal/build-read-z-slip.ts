import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import type { ResolvedThermalLayout } from "./types"
import {
  THERMAL_COLUMNS,
  formatThermalMoney2,
  padThermalLine,
  repeatThermalChar,
} from "./format"
import { buildReadZGroupTableText } from "./read-z-group-table-text"
export { buildReadZGroupTableText } from "./read-z-group-table-text"
import { buildTicketLayout } from "./build-ticket-layout"
import { serializeTicketLayoutToText } from "./serialize-ticket-layout-text"

/** Payment + summary tail — group table is rendered separately in preview. */
export function buildReadZSlipTailText(report: ReadReportPayload): string {
  if (report.mode !== "Z") {
    throw new Error("buildReadZSlipTailText requires Z report")
  }

  const w = THERMAL_COLUMNS
  const lines: string[] = []

  lines.push("")
  lines.push(repeatThermalChar("-", w))
  for (const payment of report.paymentLines) {
    lines.push(padThermalLine(payment.label, formatThermalMoney2(payment.amount), w))
  }

  lines.push("")
  lines.push(repeatThermalChar("-", w))
  lines.push(padThermalLine("Receipts", String(report.saleCount), w))
  lines.push(padThermalLine("Refunds", String(report.refundCount), w))
  lines.push(padThermalLine("Gross sales", formatThermalMoney2(report.grandTotal), w))
  if (report.refundCount > 0) {
    lines.push(padThermalLine("Refund total", formatThermalMoney2(report.refundTotal), w))
  }
  lines.push(padThermalLine("Net sales", formatThermalMoney2(report.netTotal), w))

  lines.push("")
  lines.push(padThermalLine("TOTAL", formatThermalMoney2(report.netTotal), w))

  return lines.join("\n")
}

/** Slip body only — header/identity/ref-staff are layout blocks. */
export function buildReadZSlipBodyText(report: ReadReportPayload): string {
  if (report.mode !== "Z") {
    throw new Error("buildReadZSlipBodyText requires Z report")
  }

  return [buildReadZGroupTableText(report.groupLines), buildReadZSlipTailText(report)].join("\n")
}

/** READ Z slip: Header → Group → Payment → Summary → Total → Footer. */
export function buildReadZSlipText(
  report: ReadReportPayload,
  layout: ResolvedThermalLayout
): string {
  if (report.mode !== "Z") {
    throw new Error("buildReadZSlipText requires Z report")
  }

  return serializeTicketLayoutToText(
    buildTicketLayout({ documentType: "READ_Z", report, layout })
  )
}
