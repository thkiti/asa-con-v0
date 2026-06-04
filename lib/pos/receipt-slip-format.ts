import { DEFAULT_RECEIPT_PRINT_SETTINGS } from "@/lib/receipt-settings/defaults"
import type { ReceiptPrintContext } from "./receipt-print-context"
import { formatReceiptMoney } from "./receipt-money"
export { formatReceiptMoney } from "./receipt-money"
import { calculateReceiptVat7FromInclusive } from "./receipt-vat-display"

/** Safe printable text columns — TM-U220 80mm @ 14px Courier; reduce if amounts clip. */
export const RECEIPT_COLUMNS = 30

/** Reserved width for right-aligned money (fits 99999.99). Never truncated. */
export const RECEIPT_AMOUNT_COL_WIDTH = 8

/** @deprecated Use RECEIPT_COLUMNS */
export const RECEIPT_PRINT_COLUMNS = RECEIPT_COLUMNS

export const RECEIPT_NAME_ELLIPSIS = "..."

/** Unit price on item detail line — omit decimals when whole number (e.g. 1x60). */
export function formatReceiptCompactUnitPrice(value: string | number): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return "0"
  if (Math.abs(n - Math.round(n)) < 1e-9) {
    return String(Math.round(n))
  }
  return n.toFixed(2)
}

/** Spaces between left text and amount column (minimum). */
export const RECEIPT_AMOUNT_MIN_GAP = 2

/**
 * Truncate descriptive text; amount lines use {@link padReceiptLine} instead.
 */
export function truncateReceiptText(
  text: string,
  maxWidth: number,
  ellipsis = RECEIPT_NAME_ELLIPSIS
): string {
  const t = text.trim()
  if (!t) return ""
  if (t.length <= maxWidth) return t
  if (maxWidth <= ellipsis.length) return t.slice(0, maxWidth)
  return t.slice(0, maxWidth - ellipsis.length) + ellipsis
}

/** Max character width of all money strings on one receipt slip. */
export function computeReceiptMaxAmountWidth(receipt: ReceiptPrintContext): number {
  const amounts: string[] = []
  for (const item of receipt.lines) {
    amounts.push(formatReceiptMoney(item.lineTotal))
  }
  amounts.push(
    formatReceiptMoney(receipt.total),
    calculateReceiptVat7FromInclusive(receipt.total),
    formatReceiptMoney(receipt.cashAmount),
    formatReceiptMoney(receipt.change)
  )
  return Math.max(4, ...amounts.map((a) => a.length))
}

/**
 * Left text + gap + right-aligned amount in a fixed-width column.
 * `amountWidth` is shared for the whole receipt so every amount lines up.
 */
export function formatReceiptAmountLine(
  leftText: string,
  amountText: string,
  columns: number,
  amountWidth: number
): string {
  const amount = amountText.trim()
  if (!amount) {
    return leftText.slice(0, columns).padEnd(columns, " ")
  }

  const colWidth = Math.max(amountWidth, amount.length)
  const amountCol = amount.padStart(colWidth, " ")
  const minGap = RECEIPT_AMOUNT_MIN_GAP
  const maxLeftLen = Math.max(0, columns - colWidth - minGap)
  const left = leftText.length > maxLeftLen ? leftText.slice(0, maxLeftLen) : leftText
  const gapLen = columns - left.length - amountCol.length
  return `${left}${" ".repeat(Math.max(minGap, gapLen))}${amountCol}`
}

/** @deprecated Prefer {@link formatReceiptAmountLine} with receipt-wide amountWidth. */
export function padReceiptLine(left: string, right: string, width = RECEIPT_COLUMNS): string {
  const amount = right.trim()
  if (!amount) {
    return left.slice(0, width).padEnd(width, " ")
  }
  return formatReceiptAmountLine(left, amount, width, amount.length)
}

export function centerReceiptLine(text: string, width = RECEIPT_COLUMNS): string {
  const t = text.trim()
  if (!t.length) return ""
  if (t.length >= width) return t.slice(0, width)
  const pad = Math.floor((width - t.length) / 2)
  return `${" ".repeat(pad)}${t}${" ".repeat(width - pad - t.length)}`
}

export function repeatReceiptChar(ch: string, width = RECEIPT_COLUMNS): string {
  return ch.repeat(Math.min(width, RECEIPT_COLUMNS))
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

/** Wrap product name only — hard-wrap at column width. */
export function wrapReceiptTextLines(text: string, width = RECEIPT_COLUMNS): string[] {
  const t = text.trim()
  if (!t) return []
  if (t.length <= width) return [t]
  const lines: string[] = []
  for (let i = 0; i < t.length; i += width) {
    lines.push(t.slice(i, i + width))
  }
  return lines
}

/** One truncated name line — never wraps full product name across the slip width. */
export function wrapReceiptProductName(name: string, width = RECEIPT_COLUMNS): string[] {
  const line = truncateReceiptText(name, width)
  return line ? [line] : []
}

export function formatReceiptItemDetailLine(
  item: { code: string; qty: number; unitPrice: string; lineTotal: string },
  width = RECEIPT_COLUMNS,
  amountWidth: number
): string {
  const code = item.code.trim() || "-"
  const left = `${code}=${item.qty}x${formatReceiptCompactUnitPrice(item.unitPrice)}`
  return formatReceiptAmountLine(
    left,
    formatReceiptMoney(item.lineTotal),
    width,
    amountWidth
  )
}

function appendReceiptNo(lines: string[], receiptNo: string, width: number): void {
  if (receiptNo.length <= width - 8) {
    lines.push(padReceiptLine("Receipt", receiptNo, width))
    return
  }
  lines.push("Receipt")
  const no = receiptNo.length > width ? receiptNo.slice(0, width) : receiptNo
  lines.push(no)
}

function appendCenteredIfPresent(lines: string[], text: string | null | undefined, width: number): void {
  const t = text?.trim()
  if (!t) return
  if (t.length <= width) {
    const centered = centerReceiptLine(t, width)
    if (centered) lines.push(centered)
    return
  }
  for (const chunk of wrapReceiptTextLines(t, width)) {
    const centered = centerReceiptLine(chunk, width)
    if (centered) lines.push(centered)
  }
}

export function buildReceiptSlipText(receipt: ReceiptPrintContext): string {
  const out: string[] = []
  const w = RECEIPT_COLUMNS
  const settings = receipt.settings ?? DEFAULT_RECEIPT_PRINT_SETTINGS

  appendCenteredIfPresent(out, receipt.companyDisplayName, w)
  if (receipt.companyTaxId) {
    appendCenteredIfPresent(out, `Tax ID ${receipt.companyTaxId}`, w)
  }
  if (receipt.machineTaxId) {
    appendCenteredIfPresent(out, `Machine ID ${receipt.machineTaxId}`, w)
  }
  appendCenteredIfPresent(out, `${receipt.branchCode} ${receipt.branchName}`, w)
  appendCenteredIfPresent(out, receipt.branchAddress, w)
  if (receipt.branchPhone) {
    appendCenteredIfPresent(out, `Tel. ${receipt.branchPhone}`, w)
  }
  if (settings.showAbbreviatedTaxTitle) {
    const taxTitle = centerReceiptLine("ใบกำกับภาษีอย่างย่อ", w)
    if (taxTitle) out.push(taxTitle)
  }

  out.push(repeatReceiptChar("-", w))
  appendReceiptNo(out, receipt.receiptNo, w)
  out.push(padReceiptLine("Date", formatReceiptDateTime(receipt.issuedAt), w))
  if (receipt.cashierDisplay) {
    const cashier = receipt.cashierDisplay
    if (cashier.length <= w - 9) {
      out.push(padReceiptLine("Cashier", cashier, w))
    } else {
      out.push("Cashier")
      out.push(cashier.length > w ? cashier.slice(0, w) : cashier)
    }
  }
  out.push(repeatReceiptChar("-", w))

  const amountWidth = computeReceiptMaxAmountWidth(receipt)

  for (const item of receipt.lines) {
    const nameLine = truncateReceiptText(item.name, w)
    if (nameLine) out.push(nameLine)
    out.push(formatReceiptItemDetailLine(item, w, amountWidth))
  }

  out.push(repeatReceiptChar("-", w))
  out.push(
    formatReceiptAmountLine("TOTAL", formatReceiptMoney(receipt.total), w, amountWidth)
  )
  out.push(
    formatReceiptAmountLine(
      "VAT 7%",
      calculateReceiptVat7FromInclusive(receipt.total),
      w,
      amountWidth
    )
  )
  out.push(
    formatReceiptAmountLine("CASH", formatReceiptMoney(receipt.cashAmount), w, amountWidth)
  )
  out.push(
    formatReceiptAmountLine("CHANGE", formatReceiptMoney(receipt.change), w, amountWidth)
  )
  out.push(repeatReceiptChar("-", w))

  if (settings.showVatIncludedMessage) {
    const line = centerReceiptLine("ราคาสินค้ารวมภาษีมูลค่าเพิ่มแล้ว", w)
    if (line) out.push(line)
  }

  const footers = [
    settings.footerLine1,
    settings.footerLine2,
    settings.footerLine3,
    settings.footerLine4,
    settings.footerLine5,
  ]
  for (const footer of footers) {
    appendCenteredIfPresent(out, footer, w)
  }

  out.push("")
  return out.join("\n")
}
