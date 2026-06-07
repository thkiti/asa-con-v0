import {
  RECEIPT_COLUMNS,
  centerReceiptLine,
  padReceiptLine,
  repeatReceiptChar,
} from "@/lib/pos/receipt-slip-format"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

function formatMoney2(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatRowQty(q: number): string {
  if (Number.isInteger(q)) return String(q)
  return q.toFixed(2)
}

function formatCollectorDetailLine(
  left: string,
  qty: number,
  amount: number,
  width = RECEIPT_COLUMNS
): string {
  const amt = formatMoney2(amount)
  const qtyStr = formatRowQty(qty)
  const rightPart = `${qtyStr.padStart(4)} ${amt}`
  const maxLeft = width - rightPart.length
  const leftPart =
    left.length > maxLeft ? `${left.slice(0, Math.max(0, maxLeft - 1))}…` : left
  const gap = width - leftPart.length - rightPart.length
  return `${leftPart}${" ".repeat(Math.max(1, gap))}${rightPart}`
}

function formatBangkokPrintTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
  })
}

/** Thermal collector ticket body from on-screen COLLECT payload — no fetch. */
export function buildCollectorTicketSlipText(report: ReadReportPayload): string {
  if (report.mode !== "COLLECT") {
    throw new Error("buildCollectorTicketSlipText requires COLLECT report")
  }

  const w = RECEIPT_COLUMNS
  const lines: string[] = []

  const pushCenter = (text: string) => {
    const centered = centerReceiptLine(text, w)
    if (centered) lines.push(centered)
  }

  pushCenter("ASA SERVICES")
  pushCenter(report.branchName.trim() || report.branchCode)
  pushCenter("Collector Report")
  lines.push("")

  const dateRange =
    report.bangkokDateFrom && report.bangkokDateTo
      ? `${report.bangkokDateFrom} – ${report.bangkokDateTo}`
      : report.bangkokDate
  lines.push(`Date ${dateRange}`.slice(0, w))
  lines.push(`Printed ${formatBangkokPrintTime(report.generatedAt)}`.slice(0, w))
  lines.push("")

  lines.push(`Collector ${report.staffId}`.slice(0, w))
  if (report.staffName.trim()) {
    lines.push(report.staffName.trim().slice(0, w))
  }
  lines.push("")

  lines.push(padReceiptLine("Tickets", String(report.saleCount), w))
  lines.push(padReceiptLine("Total", formatMoney2(report.grandTotal), w))
  lines.push("")

  lines.push(repeatReceiptChar("-", w))
  lines.push(
    `${"Group Code-Name".padEnd(17)}${"Qty".padStart(4)} ${"Amount".padStart(8)}`.slice(
      0,
      w
    )
  )

  if (report.groupLines.length === 0) {
    pushCenter("No sales in range")
  } else {
    for (const row of report.groupLines) {
      lines.push(formatCollectorDetailLine(row.displayLeft, row.qty, row.amount, w))
    }
  }

  lines.push("")
  for (const payment of report.paymentLines) {
    lines.push(padReceiptLine(payment.label, formatMoney2(payment.amount), w))
  }
  lines.push(padReceiptLine("TOTAL", formatMoney2(report.grandTotal), w))

  return lines.join("\n")
}

export const COLLECTOR_TICKET_SIGNATURE_LINES = [
  repeatReceiptChar("-", RECEIPT_COLUMNS),
  "",
  "Collector Signature",
  "",
  repeatReceiptChar(".", RECEIPT_COLUMNS),
  "",
  "Date ....../....../........",
] as const
