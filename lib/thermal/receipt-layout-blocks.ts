import type { ThermalDocumentLayoutView } from "./types"
import {
  DEFAULT_RECEIPT_BLOCK_FONT_PX,
  normalizeReceiptBlockFontPx,
  type ReceiptBlockFontPx,
} from "./receipt-block-font-size"

/** Split user block text into printable lines; skip empty lines. */
export function splitReceiptBlockLines(text: string | null | undefined): string[] {
  if (!text) return []
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
}

export function legacyHeaderLinesToBlock(
  layout: Pick<ThermalDocumentLayoutView, "headerLine1" | "headerLine2" | "headerLine3">
): string {
  return [layout.headerLine1, layout.headerLine2, layout.headerLine3]
    .map((line) => line?.trim() ?? "")
    .filter(Boolean)
    .join("\n")
}

export function legacyFooterLinesToBlock(
  layout: Pick<
    ThermalDocumentLayoutView,
    "footerLine1" | "footerLine2" | "footerLine3" | "footerLine4" | "footerLine5"
  >
): string {
  return [
    layout.footerLine1,
    layout.footerLine2,
    layout.footerLine3,
    layout.footerLine4,
    layout.footerLine5,
  ]
    .map((line) => line?.trim() ?? "")
    .filter(Boolean)
    .join("\n")
}

export function resolveHeaderBlockText(
  layout: Pick<
    ThermalDocumentLayoutView,
    "headerBlockText" | "headerLine1" | "headerLine2" | "headerLine3"
  >
): string | null {
  if (layout.headerBlockText !== null && layout.headerBlockText !== undefined) {
    const block = layout.headerBlockText.trim()
    return block || null
  }
  const legacy = legacyHeaderLinesToBlock(layout)
  return legacy || null
}

export function resolveFooterBlockText(
  layout: Pick<
    ThermalDocumentLayoutView,
    | "footerBlockText"
    | "footerLine1"
    | "footerLine2"
    | "footerLine3"
    | "footerLine4"
    | "footerLine5"
  >
): string | null {
  if (layout.footerBlockText !== null && layout.footerBlockText !== undefined) {
    const block = layout.footerBlockText.trim()
    return block || null
  }
  const legacy = legacyFooterLinesToBlock(layout)
  return legacy || null
}

export function resolveHeaderBlockLines(
  layout: Pick<
    ThermalDocumentLayoutView,
    "headerBlockText" | "headerLine1" | "headerLine2" | "headerLine3"
  >
): string[] {
  return splitReceiptBlockLines(resolveHeaderBlockText(layout))
}

export function resolveFooterBlockLines(
  layout: Pick<
    ThermalDocumentLayoutView,
    | "footerBlockText"
    | "footerLine1"
    | "footerLine2"
    | "footerLine3"
    | "footerLine4"
    | "footerLine5"
  >
): string[] {
  return splitReceiptBlockLines(resolveFooterBlockText(layout))
}

export function resolveSubHeaderBlockText(
  layout: Pick<ThermalDocumentLayoutView, "subHeaderBlockText" | "showAbbreviatedTaxTitle">
): string | null {
  if (layout.subHeaderBlockText !== null && layout.subHeaderBlockText !== undefined) {
    const block = layout.subHeaderBlockText.trim()
    if (block) return block
  }
  if (layout.showAbbreviatedTaxTitle) {
    return "ใบกำกับภาษีอย่างย่อ"
  }
  return null
}

export function resolveSubHeaderBlockLines(
  layout: Pick<ThermalDocumentLayoutView, "subHeaderBlockText" | "showAbbreviatedTaxTitle">
): string[] {
  return splitReceiptBlockLines(resolveSubHeaderBlockText(layout))
}

export function blockLinesToLegacyHeader(
  lines: string[]
): Pick<ThermalDocumentLayoutView, "headerLine1" | "headerLine2" | "headerLine3"> {
  return {
    headerLine1: lines[0]?.trim() || null,
    headerLine2: lines[1]?.trim() || null,
    headerLine3: lines[2]?.trim() || null,
  }
}

export function blockLinesToLegacyFooter(
  lines: string[]
): Pick<
  ThermalDocumentLayoutView,
  "footerLine1" | "footerLine2" | "footerLine3" | "footerLine4" | "footerLine5"
> {
  return {
    footerLine1: lines[0]?.trim() || null,
    footerLine2: lines[1]?.trim() || null,
    footerLine3: lines[2]?.trim() || null,
    footerLine4: lines[3]?.trim() || null,
    footerLine5: lines[4]?.trim() || null,
  }
}

export function receiptLayoutBlocksFromView(
  view: ThermalDocumentLayoutView
): {
  headerBlockText: string
  footerBlockText: string
  subHeaderBlockText: string
  headerFontSize: ReceiptBlockFontPx
  footerFontSize: ReceiptBlockFontPx
  subHeaderFontSize: ReceiptBlockFontPx
  headerBlockBold: boolean
  footerBlockBold: boolean
  subHeaderBlockBold: boolean
} {
  return {
    headerBlockText: resolveHeaderBlockText(view) ?? "",
    footerBlockText: resolveFooterBlockText(view) ?? "",
    subHeaderBlockText: view.subHeaderBlockText?.trim() ?? "",
    headerFontSize: normalizeReceiptBlockFontPx(view.headerFontSize),
    footerFontSize: normalizeReceiptBlockFontPx(view.footerFontSize),
    subHeaderFontSize: normalizeReceiptBlockFontPx(view.subHeaderFontSize),
    headerBlockBold: view.headerBlockBold,
    footerBlockBold: view.footerBlockBold,
    subHeaderBlockBold: view.subHeaderBlockBold,
  }
}

export function mergeReceiptBlockMutation(
  input: Pick<
    ThermalDocumentLayoutView,
    | "headerBlockText"
    | "footerBlockText"
    | "headerFontSize"
    | "footerFontSize"
    | "headerBlockBold"
    | "footerBlockBold"
    | "headerLine1"
    | "headerLine2"
    | "headerLine3"
    | "footerLine1"
    | "footerLine2"
    | "footerLine3"
    | "footerLine4"
    | "footerLine5"
  >
): Pick<
  ThermalDocumentLayoutView,
  | "headerBlockText"
  | "footerBlockText"
  | "headerFontSize"
  | "footerFontSize"
  | "headerBlockBold"
  | "footerBlockBold"
  | "headerLine1"
  | "headerLine2"
  | "headerLine3"
  | "footerLine1"
  | "footerLine2"
  | "footerLine3"
  | "footerLine4"
  | "footerLine5"
> {
  const headerBlockRaw = normalizeBlockTextRaw(input.headerBlockText)
  const footerBlockRaw = normalizeBlockTextRaw(input.footerBlockText)

  let headerLines = splitReceiptBlockLines(headerBlockRaw)
  if (headerLines.length === 0 && headerBlockRaw === null) {
    headerLines = splitReceiptBlockLines(legacyHeaderLinesToBlock(input))
  }

  let footerLines = splitReceiptBlockLines(footerBlockRaw)
  if (footerLines.length === 0 && footerBlockRaw === null) {
    footerLines = splitReceiptBlockLines(legacyFooterLinesToBlock(input))
  }

  const legacyHeader = blockLinesToLegacyHeader(headerLines)
  const legacyFooter = blockLinesToLegacyFooter(footerLines)

  return {
    headerBlockText:
      headerBlockRaw ?? (headerLines.length > 0 ? headerLines.join("\n") : null),
    footerBlockText:
      footerBlockRaw ?? (footerLines.length > 0 ? footerLines.join("\n") : null),
    headerFontSize: normalizeReceiptBlockFontPx(input.headerFontSize),
    footerFontSize: normalizeReceiptBlockFontPx(input.footerFontSize),
    headerBlockBold: input.headerBlockBold ?? true,
    footerBlockBold: input.footerBlockBold ?? true,
    ...legacyHeader,
    ...legacyFooter,
  }
}

function normalizeBlockTextRaw(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  const raw = String(value)
  if (!raw.trim()) return null
  return raw
}
