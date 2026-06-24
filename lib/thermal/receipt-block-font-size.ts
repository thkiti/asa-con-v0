export const DEFAULT_RECEIPT_BLOCK_FONT_PX = 12

/** Default info block (branch/legal + Ref/Date + Staff). */
export const DEFAULT_INFO_BLOCK_FONT_PX = 14

/** Legacy enum values stored before numeric px migration. */
const LEGACY_RECEIPT_BLOCK_FONT_PX: Record<string, number> = {
  small: 10,
  normal: 12,
  large: 14,
}

/** Receipt header/footer font size in px (preview + print only). */
export type ReceiptBlockFontPx = number

function roundFontPx(px: number): ReceiptBlockFontPx {
  return Math.max(1, Math.round(px))
}

export function normalizeReceiptBlockFontPx(
  value: string | number | null | undefined
): ReceiptBlockFontPx {
  if (typeof value === "number" && Number.isFinite(value)) {
    return roundFontPx(value)
  }
  const raw = String(value ?? "").trim().toLowerCase()
  if (!raw) return DEFAULT_RECEIPT_BLOCK_FONT_PX
  if (raw in LEGACY_RECEIPT_BLOCK_FONT_PX) {
    return LEGACY_RECEIPT_BLOCK_FONT_PX[raw]
  }
  const parsed = Number.parseInt(raw, 10)
  if (Number.isFinite(parsed)) return roundFontPx(parsed)
  return DEFAULT_RECEIPT_BLOCK_FONT_PX
}

export function stepReceiptBlockFontPx(
  current: ReceiptBlockFontPx,
  direction: "decrease" | "increase"
): ReceiptBlockFontPx {
  return roundFontPx(current + (direction === "increase" ? 1 : -1))
}

export function formatReceiptBlockFontPxForStorage(px: ReceiptBlockFontPx): string {
  return String(roundFontPx(px))
}

export function receiptBlockFontPxLabel(px: ReceiptBlockFontPx): string {
  return String(roundFontPx(px))
}

export function normalizeInfoBlockFontPx(
  value: string | number | null | undefined
): ReceiptBlockFontPx {
  if (typeof value === "number" && Number.isFinite(value)) {
    return roundFontPx(value)
  }
  const raw = String(value ?? "").trim().toLowerCase()
  if (!raw) return DEFAULT_INFO_BLOCK_FONT_PX
  if (raw in LEGACY_RECEIPT_BLOCK_FONT_PX) {
    return LEGACY_RECEIPT_BLOCK_FONT_PX[raw]
  }
  const parsed = Number.parseInt(raw, 10)
  if (Number.isFinite(parsed)) return roundFontPx(parsed)
  return DEFAULT_INFO_BLOCK_FONT_PX
}
