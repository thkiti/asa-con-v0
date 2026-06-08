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

/** Thermal collector ticket from on-screen COLLECT payload — no fetch. */
export function buildCollectorSlipText(
  report: ReadReportPayload,
  layout: ResolvedThermalLayout
): string {
  if (report.mode !== "COLLECT") {
    throw new Error("buildCollectorSlipText requires COLLECT report")
  }

  const w = THERMAL_COLUMNS
  const lines: string[] = []

  appendThermalHeaderLines(lines, layout, w)
  const branchLine = centerThermalLine(report.branchName.trim() || report.branchCode, w)
  if (branchLine) lines.push(branchLine)
  lines.push("")

  const dateRange =
    report.bangkokDateFrom && report.bangkokDateTo
      ? `${report.bangkokDateFrom} – ${report.bangkokDateTo}`
      : report.bangkokDate
  lines.push(`Date ${dateRange}`.slice(0, w))
  lines.push(`Printed ${formatThermalBangkokPrintTime(report.generatedAt)}`.slice(0, w))
  lines.push("")

  lines.push(`Collector ${report.staffId}`.slice(0, w))
  if (report.staffName.trim()) {
    lines.push(report.staffName.trim().slice(0, w))
  }
  lines.push("")

  lines.push(padThermalLine("Tickets", String(report.saleCount), w))
  lines.push(padThermalLine("Total", formatThermalMoney2(report.grandTotal), w))
  lines.push("")

  lines.push(repeatThermalChar("-", w))
  lines.push(
    `${"Group Code-Name".padEnd(17)}${"Qty".padStart(4)} ${"Amount".padStart(8)}`.slice(0, w)
  )

  if (report.groupLines.length === 0) {
    const empty = centerThermalLine("No sales in range", w)
    if (empty) lines.push(empty)
  } else {
    for (const row of report.groupLines) {
      lines.push(formatDetailLine(row.displayLeft, row.qty, row.amount, w))
    }
  }

  lines.push("")
  for (const payment of report.paymentLines) {
    lines.push(padThermalLine(payment.label, formatThermalMoney2(payment.amount), w))
  }
  lines.push(padThermalLine("TOTAL", formatThermalMoney2(report.grandTotal), w))

  appendThermalFooterLines(lines, layout, w)
  return lines.join("\n")
}

export const COLLECTOR_SIGNATURE_LINES = [
  repeatThermalChar("-", THERMAL_COLUMNS),
  "",
  "Collector Signature",
  "",
  repeatThermalChar(".", THERMAL_COLUMNS),
  "",
  "Date ....../....../........",
] as const

/** @deprecated Use COLLECTOR_SIGNATURE_LINES */
export const COLLECTOR_TICKET_SIGNATURE_LINES = COLLECTOR_SIGNATURE_LINES
