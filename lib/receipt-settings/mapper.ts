import type { ReceiptPrintSettings } from "@/generated/prisma/client"
import { DEFAULT_RECEIPT_PRINT_SETTINGS } from "./defaults"
import type { ReceiptPrintSettingsView } from "./types"

export function toReceiptPrintSettingsView(
  row: ReceiptPrintSettings | null
): ReceiptPrintSettingsView {
  if (!row) {
    return { ...DEFAULT_RECEIPT_PRINT_SETTINGS }
  }
  return {
    companyDisplayName: row.companyDisplayName?.trim() || null,
    footerLine1: row.footerLine1?.trim() || null,
    footerLine2: row.footerLine2?.trim() || null,
    footerLine3: row.footerLine3?.trim() || null,
    footerLine4: row.footerLine4?.trim() || null,
    footerLine5: row.footerLine5?.trim() || null,
    showAbbreviatedTaxTitle: row.showAbbreviatedTaxTitle,
    showVatIncludedMessage: row.showVatIncludedMessage,
  }
}
