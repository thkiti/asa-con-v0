import type { PrismaClient } from "@/generated/prisma/client"
import { RECEIPT_PRINT_SETTINGS_ID } from "./constants"
import { toReceiptPrintSettingsView } from "./mapper"
import type { ReceiptPrintSettingsView, UpdateReceiptPrintSettingsInput } from "./types"

type SettingsDb = Pick<PrismaClient, "receiptPrintSettings">

export async function updateReceiptPrintSettings(
  db: SettingsDb,
  input: UpdateReceiptPrintSettingsInput
): Promise<ReceiptPrintSettingsView> {
  const row = await db.receiptPrintSettings.upsert({
    where: { id: RECEIPT_PRINT_SETTINGS_ID },
    create: {
      id: RECEIPT_PRINT_SETTINGS_ID,
      companyDisplayName: input.companyDisplayName,
      footerLine1: input.footerLine1,
      footerLine2: input.footerLine2,
      footerLine3: input.footerLine3,
      footerLine4: input.footerLine4,
      footerLine5: input.footerLine5,
      showAbbreviatedTaxTitle: input.showAbbreviatedTaxTitle,
      showVatIncludedMessage: input.showVatIncludedMessage,
    },
    update: {
      companyDisplayName: input.companyDisplayName,
      footerLine1: input.footerLine1,
      footerLine2: input.footerLine2,
      footerLine3: input.footerLine3,
      footerLine4: input.footerLine4,
      footerLine5: input.footerLine5,
      showAbbreviatedTaxTitle: input.showAbbreviatedTaxTitle,
      showVatIncludedMessage: input.showVatIncludedMessage,
    },
  })
  return toReceiptPrintSettingsView(row)
}
