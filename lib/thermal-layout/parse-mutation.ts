import { ThermalLayoutError } from "./errors"
import { THERMAL_LAYOUT_MAX } from "./constants"
import type { UpdateThermalDocumentLayoutInput } from "@/lib/thermal/types"
import {
  formatReceiptBlockFontPxForStorage,
  normalizeInfoBlockFontPx,
  normalizeReceiptBlockFontPx,
} from "@/lib/thermal/receipt-block-font-size"

function parseOptionalString(
  value: unknown,
  field: string,
  maxLen: number
): string | null {
  if (value === undefined || value === null) return null
  const raw = String(value).trim()
  if (!raw) return null
  if (raw.length > maxLen) {
    throw new ThermalLayoutError(
      `${field} must be at most ${maxLen} characters`,
      "VALIDATION_ERROR",
      400
    )
  }
  return raw
}

function parseOptionalBlockText(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null
  const raw = String(value)
  if (!raw.trim()) return null
  if (raw.length > THERMAL_LAYOUT_MAX.blockText) {
    throw new ThermalLayoutError(
      `${field} must be at most ${THERMAL_LAYOUT_MAX.blockText} characters`,
      "VALIDATION_ERROR",
      400
    )
  }
  return raw
}

function parseBlockFontPx(value: unknown, field: string): string {
  if (value === undefined || value === null || value === "") {
    return formatReceiptBlockFontPxForStorage(normalizeReceiptBlockFontPx(null))
  }
  const px = normalizeReceiptBlockFontPx(
    typeof value === "number" ? value : String(value)
  )
  if (!Number.isFinite(px)) {
    throw new ThermalLayoutError(`${field} must be a font size in px`, "VALIDATION_ERROR", 400)
  }
  return formatReceiptBlockFontPxForStorage(px)
}

function parseBoolean(value: unknown, field: string, defaultValue = false): boolean {
  if (value === undefined || value === null) return defaultValue
  if (typeof value === "boolean") return value
  if (value === "true") return true
  if (value === "false") return false
  throw new ThermalLayoutError(`${field} must be a boolean`, "VALIDATION_ERROR", 400)
}

export function parseUpdateThermalDocumentLayoutBody(
  body: unknown
): UpdateThermalDocumentLayoutInput {
  if (!body || typeof body !== "object") {
    throw new ThermalLayoutError("Invalid request body", "VALIDATION_ERROR", 400)
  }
  const record = body as Record<string, unknown>

  return {
    headerLine1: parseOptionalString(record.headerLine1, "headerLine1", THERMAL_LAYOUT_MAX.headerLine),
    headerLine2: parseOptionalString(record.headerLine2, "headerLine2", THERMAL_LAYOUT_MAX.headerLine),
    headerLine3: parseOptionalString(record.headerLine3, "headerLine3", THERMAL_LAYOUT_MAX.headerLine),
    footerLine1: parseOptionalString(record.footerLine1, "footerLine1", THERMAL_LAYOUT_MAX.footerLine),
    footerLine2: parseOptionalString(record.footerLine2, "footerLine2", THERMAL_LAYOUT_MAX.footerLine),
    footerLine3: parseOptionalString(record.footerLine3, "footerLine3", THERMAL_LAYOUT_MAX.footerLine),
    footerLine4: parseOptionalString(record.footerLine4, "footerLine4", THERMAL_LAYOUT_MAX.footerLine),
    footerLine5: parseOptionalString(record.footerLine5, "footerLine5", THERMAL_LAYOUT_MAX.footerLine),
    headerBlockText: parseOptionalBlockText(record.headerBlockText, "headerBlockText"),
    headerFontSize: normalizeReceiptBlockFontPx(
      parseBlockFontPx(record.headerFontSize, "headerFontSize")
    ),
    headerBlockBold: parseBoolean(record.headerBlockBold, "headerBlockBold", true),
    subHeaderBlockText: parseOptionalBlockText(
      record.subHeaderBlockText ?? record.subHeaderText,
      "subHeaderBlockText"
    ),
    subHeaderFontSize: normalizeReceiptBlockFontPx(
      parseBlockFontPx(record.subHeaderFontSize, "subHeaderFontSize")
    ),
    subHeaderBlockBold: parseBoolean(
      record.subHeaderBlockBold ?? record.subHeaderBold,
      "subHeaderBlockBold",
      false
    ),
    footerBlockText: parseOptionalBlockText(record.footerBlockText, "footerBlockText"),
    footerFontSize: normalizeReceiptBlockFontPx(
      parseBlockFontPx(record.footerFontSize, "footerFontSize")
    ),
    footerBlockBold: parseBoolean(record.footerBlockBold, "footerBlockBold", true),
    infoBlockFontSize: normalizeInfoBlockFontPx(
      parseBlockFontPx(record.infoBlockFontSize, "infoBlockFontSize")
    ),
    infoBlockBold: parseBoolean(record.infoBlockBold, "infoBlockBold", true),
    showAbbreviatedTaxTitle: parseBoolean(
      record.showAbbreviatedTaxTitle ?? true,
      "showAbbreviatedTaxTitle"
    ),
    showVatIncludedMessage: parseBoolean(
      record.showVatIncludedMessage ?? true,
      "showVatIncludedMessage"
    ),
  }
}
