/** Safe printable text columns — TM-U220 80mm @ 12px bold Courier. */
export const THERMAL_COLUMNS = 30

/** @deprecated Use THERMAL_COLUMNS */
export const RECEIPT_COLUMNS = THERMAL_COLUMNS

/** Reserved width for right-aligned money (fits 99999.99). Never truncated. */
export const THERMAL_AMOUNT_COL_WIDTH = 8

/** @deprecated Use THERMAL_COLUMNS */
export const RECEIPT_PRINT_COLUMNS = THERMAL_COLUMNS

/** @deprecated Use THERMAL_COLUMNS */
export const THERMAL_PRINT_COLUMNS = THERMAL_COLUMNS

/** @deprecated Use THERMAL_AMOUNT_COL_WIDTH */
export const RECEIPT_AMOUNT_COL_WIDTH = THERMAL_AMOUNT_COL_WIDTH

export const THERMAL_NAME_ELLIPSIS = "..."

/** @deprecated Use THERMAL_NAME_ELLIPSIS */
export const RECEIPT_NAME_ELLIPSIS = THERMAL_NAME_ELLIPSIS

/** Spaces between left text and amount column (minimum). */
export const THERMAL_AMOUNT_MIN_GAP = 2

/** @deprecated Use THERMAL_AMOUNT_MIN_GAP */
export const RECEIPT_AMOUNT_MIN_GAP = THERMAL_AMOUNT_MIN_GAP

export function formatThermalCompactUnitPrice(value: string | number): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return "0"
  if (Math.abs(n - Math.round(n)) < 1e-9) {
    return String(Math.round(n))
  }
  return n.toFixed(2)
}

/** @deprecated Use formatThermalCompactUnitPrice */
export const formatReceiptCompactUnitPrice = formatThermalCompactUnitPrice

export function truncateThermalText(
  text: string,
  maxWidth: number,
  ellipsis = THERMAL_NAME_ELLIPSIS
): string {
  const t = text.trim()
  if (!t) return ""
  if (t.length <= maxWidth) return t
  if (maxWidth <= ellipsis.length) return t.slice(0, maxWidth)
  return t.slice(0, maxWidth - ellipsis.length) + ellipsis
}

/** @deprecated Use truncateThermalText */
export const truncateReceiptText = truncateThermalText

export function formatThermalAmountLine(
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
  const minGap = THERMAL_AMOUNT_MIN_GAP
  const maxLeftLen = Math.max(0, columns - colWidth - minGap)
  const left = leftText.length > maxLeftLen ? leftText.slice(0, maxLeftLen) : leftText
  const gapLen = columns - left.length - amountCol.length
  return `${left}${" ".repeat(Math.max(minGap, gapLen))}${amountCol}`
}

/** @deprecated Use formatThermalAmountLine */
export const formatReceiptAmountLine = formatThermalAmountLine

export function padThermalLine(left: string, right: string, width = THERMAL_COLUMNS): string {
  const amount = right.trim()
  if (!amount) {
    return left.slice(0, width).padEnd(width, " ")
  }
  return formatThermalAmountLine(left, amount, width, amount.length)
}

/** @deprecated Use padThermalLine */
export const padReceiptLine = padThermalLine

export function centerThermalLine(text: string, width = THERMAL_COLUMNS): string {
  const t = text.trim()
  if (!t.length) return ""
  if (t.length >= width) return t.slice(0, width)
  const pad = Math.floor((width - t.length) / 2)
  return `${" ".repeat(pad)}${t}${" ".repeat(width - pad - t.length)}`
}

/** @deprecated Use centerThermalLine */
export const centerReceiptLine = centerThermalLine

export function repeatThermalChar(ch: string, width = THERMAL_COLUMNS): string {
  return ch.repeat(Math.min(width, THERMAL_COLUMNS))
}

/** @deprecated Use repeatThermalChar */
export const repeatReceiptChar = repeatThermalChar

export function formatThermalDateTime(iso: string): string {
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

/** @deprecated Use formatThermalDateTime */
export const formatReceiptDateTime = formatThermalDateTime

export function wrapThermalTextLines(text: string, width = THERMAL_COLUMNS): string[] {
  const t = text.trim()
  if (!t) return []
  if (t.length <= width) return [t]
  const lines: string[] = []
  for (let i = 0; i < t.length; i += width) {
    lines.push(t.slice(i, i + width))
  }
  return lines
}

/** @deprecated Use wrapThermalTextLines */
export const wrapReceiptTextLines = wrapThermalTextLines

export function appendThermalCenteredIfPresent(
  lines: string[],
  text: string | null | undefined,
  width: number
): void {
  const t = text?.trim()
  if (!t) return
  if (t.length <= width) {
    const centered = centerThermalLine(t, width)
    if (centered) lines.push(centered)
    return
  }
  for (const chunk of wrapThermalTextLines(t, width)) {
    const centered = centerThermalLine(chunk, width)
    if (centered) lines.push(centered)
  }
}

export function appendThermalFooterLines(
  lines: string[],
  layout: {
    footerLine1: string | null
    footerLine2: string | null
    footerLine3: string | null
    footerLine4: string | null
    footerLine5: string | null
  },
  width: number
): void {
  for (const footer of [
    layout.footerLine1,
    layout.footerLine2,
    layout.footerLine3,
    layout.footerLine4,
    layout.footerLine5,
  ]) {
    appendThermalCenteredIfPresent(lines, footer, width)
  }
}

export function appendThermalHeaderLines(
  lines: string[],
  layout: {
    headerLine1: string | null
    headerLine2: string | null
    headerLine3: string | null
  },
  width: number
): void {
  appendThermalCenteredIfPresent(lines, layout.headerLine1, width)
  appendThermalCenteredIfPresent(lines, layout.headerLine2, width)
  appendThermalCenteredIfPresent(lines, layout.headerLine3, width)
}

export function formatThermalMoney2(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatThermalBangkokPrintTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
  })
}
