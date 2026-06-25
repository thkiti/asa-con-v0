import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import type { ResolvedThermalLayout } from "./types"
import {
  THERMAL_COLUMNS,
  appendThermalFooterLines,
  appendThermalHeaderLines,
  centerThermalLine,
  formatThermalBangkokPrintTime,
  formatThermalMoney2,
  padThermalLine,
  repeatThermalChar,
} from "./format"
import { buildTicketLayout } from "./build-ticket-layout"
import { serializeTicketLayoutToText } from "./serialize-ticket-layout-text"

function formatRowQty(q: number): string {
  if (Number.isInteger(q)) return String(q)
  return q.toFixed(2)
}

function formatDetailLine(
  left: string,
  qty: number,
  amount: number,
  width = THERMAL_COLUMNS
): string {
  const amt = formatThermalMoney2(amount)
  const qtyStr = formatRowQty(qty)
  const rightPart = `${qtyStr.padStart(4)} ${amt}`
  const maxLeft = width - rightPart.length
  const leftPart =
    left.length > maxLeft ? `${left.slice(0, Math.max(0, maxLeft - 1))}…` : left
  const gap = width - leftPart.length - rightPart.length
  return `${leftPart}${" ".repeat(Math.max(1, gap))}${rightPart}`
}

/** Slip body only — header/footer are layout blocks. */
export function buildReadZSlipBodyText(report: ReadReportPayload): string {
  if (report.mode !== "Z") {
    throw new Error("buildReadZSlipBodyText requires Z report")
  }

  const w = THERMAL_COLUMNS
  const lines: string[] = []

  const branchLine = centerThermalLine(`${report.branchCode} ${report.branchName}`.trim(), w)
  if (branchLine) lines.push(branchLine)
  lines.push(`Date ${report.bangkokDate}`.slice(0, w))
  lines.push(`Printed ${formatThermalBangkokPrintTime(report.generatedAt)}`.slice(0, w))
  lines.push(`STAFF ${report.staffId}`.slice(0, w))
  if (report.staffName.trim()) {
    lines.push(report.staffName.trim().slice(0, w))
  }
  lines.push("")

  lines.push(repeatThermalChar("-", w))
  lines.push(
    `${"Group Code-Name".padEnd(17)}${"Qty".padStart(4)} ${"Amount".padStart(8)}`.slice(0, w)
  )

  for (const row of report.groupLines) {
    lines.push(formatDetailLine(row.displayLeft, row.qty, row.amount, w))
  }

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
