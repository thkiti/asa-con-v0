/** Printable width for Epson TM-U220 dot-matrix (~80mm, 40–42 chars). */
export const RECEIPT_PRINT_COLUMNS = 42

export function formatReceiptMoney(value: string | number): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return "0.00"
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function padReceiptLine(left: string, right: string, width = RECEIPT_PRINT_COLUMNS): string {
  const r = right.trim()
  const maxLeft = Math.max(1, width - r.length)
  const l = left.length > maxLeft ? left.slice(0, maxLeft) : left
  return `${l}${" ".repeat(Math.max(1, width - l.length - r.length))}${r}`
}

export function centerReceiptLine(text: string, width = RECEIPT_PRINT_COLUMNS): string {
  const t = text.trim()
  if (t.length >= width) return t.slice(0, width)
  const pad = Math.floor((width - t.length) / 2)
  return `${" ".repeat(pad)}${t}`
}

export function repeatReceiptChar(ch: string, width = RECEIPT_PRINT_COLUMNS): string {
  return ch.repeat(width)
}

export function formatReceiptDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export function buildReceiptSlipText(receipt: {
  branchCode: string
  branchName: string
  receiptNo: string
  issuedAt: string
  cashierStaffId: string | null
  lines: Array<{
    name: string
    code: string
    qty: number
    unitPrice: string
    lineTotal: string
  }>
  total: string
  cashAmount: string
  change: string
}): string {
  const lines: string[] = []
  const w = RECEIPT_PRINT_COLUMNS

  lines.push(centerReceiptLine("ASA SERVICES", w))
  lines.push(centerReceiptLine(`${receipt.branchCode} ${receipt.branchName}`, w))
  lines.push(repeatReceiptChar("-", w))
  lines.push(padReceiptLine("Receipt", receipt.receiptNo, w))
  lines.push(padReceiptLine("Date", formatReceiptDateTime(receipt.issuedAt), w))
  if (receipt.cashierStaffId) {
    lines.push(padReceiptLine("Cashier", receipt.cashierStaffId, w))
  }
  lines.push(repeatReceiptChar("-", w))
  lines.push(padReceiptLine("Item", "Total", w))

  for (const item of receipt.lines) {
    const title =
      item.name.length > w ? item.name.slice(0, w) : item.name
    lines.push(title)
    const detail = ` ${item.qty} x ${formatReceiptMoney(item.unitPrice)}`
    lines.push(padReceiptLine(detail, formatReceiptMoney(item.lineTotal), w))
    if (item.code) {
      const codeLine = item.code.length > w ? item.code.slice(0, w) : item.code
      lines.push(codeLine)
    }
  }

  lines.push(repeatReceiptChar("-", w))
  lines.push(padReceiptLine("TOTAL", formatReceiptMoney(receipt.total), w))
  lines.push(padReceiptLine("CASH", formatReceiptMoney(receipt.cashAmount), w))
  lines.push(padReceiptLine("CHANGE", formatReceiptMoney(receipt.change), w))
  lines.push(repeatReceiptChar("-", w))
  lines.push(centerReceiptLine("Thank you", w))
  lines.push("")

  return lines.join("\n")
}
