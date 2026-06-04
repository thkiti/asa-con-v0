import { ReceiptSettingsError } from "./errors"
import { RECEIPT_SETTINGS_MAX } from "./constants"
import type { UpdateReceiptPrintSettingsInput } from "./types"

function parseOptionalString(
  value: unknown,
  field: string,
  maxLen: number
): string | null {
  if (value === undefined || value === null) return null
  const raw = String(value).trim()
  if (!raw) return null
  if (raw.length > maxLen) {
    throw new ReceiptSettingsError(
      `${field} must be at most ${maxLen} characters`,
      "VALIDATION_ERROR",
      400
    )
  }
  return raw
}

function parseBoolean(value: unknown, field: string): boolean {
  if (typeof value === "boolean") return value
  if (value === "true") return true
  if (value === "false") return false
  throw new ReceiptSettingsError(`${field} must be a boolean`, "VALIDATION_ERROR", 400)
}

export function parseUpdateReceiptPrintSettingsBody(
  body: unknown
): UpdateReceiptPrintSettingsInput {
  if (!body || typeof body !== "object") {
    throw new ReceiptSettingsError("Invalid request body", "VALIDATION_ERROR", 400)
  }
  const record = body as Record<string, unknown>

  return {
    companyDisplayName: parseOptionalString(
      record.companyDisplayName,
      "companyDisplayName",
      RECEIPT_SETTINGS_MAX.companyDisplayName
    ),
    footerLine1: parseOptionalString(record.footerLine1, "footerLine1", RECEIPT_SETTINGS_MAX.footerLine),
    footerLine2: parseOptionalString(record.footerLine2, "footerLine2", RECEIPT_SETTINGS_MAX.footerLine),
    footerLine3: parseOptionalString(record.footerLine3, "footerLine3", RECEIPT_SETTINGS_MAX.footerLine),
    footerLine4: parseOptionalString(record.footerLine4, "footerLine4", RECEIPT_SETTINGS_MAX.footerLine),
    footerLine5: parseOptionalString(record.footerLine5, "footerLine5", RECEIPT_SETTINGS_MAX.footerLine),
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
