import type { PrismaClient } from "@/generated/prisma/client"
import { receiptSettingsToThermalLayout } from "@/lib/thermal/layout"
import { RECEIPT_PRINT_SETTINGS_ID } from "./constants"
import { toReceiptPrintSettingsView } from "./mapper"
import type { ReceiptPrintSettingsView, UpdateReceiptPrintSettingsInput } from "./types"

type SettingsDb = Pick<PrismaClient, "receiptPrintSettings" | "thermalDocumentLayout">

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

  const thermalLayout = receiptSettingsToThermalLayout(toReceiptPrintSettingsView(row))
  await db.thermalDocumentLayout.upsert({
    where: { documentType: "RECEIPT" },
    create: {
      documentType: "RECEIPT",
      headerLine1: thermalLayout.headerLine1,
      headerLine2: thermalLayout.headerLine2,
      headerLine3: thermalLayout.headerLine3,
      footerLine1: thermalLayout.footerLine1,
      footerLine2: thermalLayout.footerLine2,
      footerLine3: thermalLayout.footerLine3,
      footerLine4: thermalLayout.footerLine4,
      footerLine5: thermalLayout.footerLine5,
      showAbbreviatedTaxTitle: thermalLayout.showAbbreviatedTaxTitle,
      showVatIncludedMessage: thermalLayout.showVatIncludedMessage,
    },
    update: {
      headerLine1: thermalLayout.headerLine1,
      headerLine2: thermalLayout.headerLine2,
      headerLine3: thermalLayout.headerLine3,
      footerLine1: thermalLayout.footerLine1,
      footerLine2: thermalLayout.footerLine2,
      footerLine3: thermalLayout.footerLine3,
      footerLine4: thermalLayout.footerLine4,
      footerLine5: thermalLayout.footerLine5,
      showAbbreviatedTaxTitle: thermalLayout.showAbbreviatedTaxTitle,
      showVatIncludedMessage: thermalLayout.showVatIncludedMessage,
    },
  })

  return toReceiptPrintSettingsView(row)
}
