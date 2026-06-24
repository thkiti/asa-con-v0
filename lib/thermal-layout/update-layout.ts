import type { PrismaClient } from "@/generated/prisma/client"
import { mergeReceiptBlockMutation } from "@/lib/thermal/receipt-layout-blocks"
import { formatReceiptBlockFontPxForStorage, normalizeInfoBlockFontPx, normalizeReceiptBlockFontPx } from "@/lib/thermal/receipt-block-font-size"
import { loadThermalLayouts, toThermalDocumentLayoutView } from "@/lib/thermal/load-layouts"
import type {
  ThermalDocumentLayoutView,
  ThermalDocumentType,
  ThermalLayoutMap,
  UpdateThermalDocumentLayoutInput,
} from "@/lib/thermal/types"

type LayoutDb = Pick<PrismaClient, "thermalDocumentLayout">

export async function loadAllThermalDocumentLayouts(db: LayoutDb): Promise<ThermalLayoutMap> {
  return loadThermalLayouts(db)
}

export async function updateThermalDocumentLayout(
  db: LayoutDb,
  documentType: ThermalDocumentType,
  input: UpdateThermalDocumentLayoutInput
): Promise<ThermalDocumentLayoutView> {
  const merged = mergeReceiptBlockMutation(input)

  const row = await db.thermalDocumentLayout.upsert({
    where: { documentType },
    create: {
      documentType,
      headerLine1: merged.headerLine1,
      headerLine2: merged.headerLine2,
      headerLine3: merged.headerLine3,
      footerLine1: merged.footerLine1,
      footerLine2: merged.footerLine2,
      footerLine3: merged.footerLine3,
      footerLine4: merged.footerLine4,
      footerLine5: merged.footerLine5,
      headerBlockText: merged.headerBlockText,
      headerFontSize: formatReceiptBlockFontPxForStorage(merged.headerFontSize),
      headerBlockBold: merged.headerBlockBold,
      subHeaderBlockText: input.subHeaderBlockText?.trim() ? input.subHeaderBlockText : null,
      subHeaderFontSize: formatReceiptBlockFontPxForStorage(
        normalizeReceiptBlockFontPx(input.subHeaderFontSize)
      ),
      subHeaderBlockBold: input.subHeaderBlockBold,
      footerBlockText: merged.footerBlockText,
      footerFontSize: formatReceiptBlockFontPxForStorage(merged.footerFontSize),
      footerBlockBold: merged.footerBlockBold,
      infoBlockFontSize: formatReceiptBlockFontPxForStorage(
        normalizeInfoBlockFontPx(input.infoBlockFontSize)
      ),
      infoBlockBold: input.infoBlockBold,
      showAbbreviatedTaxTitle: input.showAbbreviatedTaxTitle,
      showVatIncludedMessage: input.showVatIncludedMessage,
    },
    update: {
      headerLine1: merged.headerLine1,
      headerLine2: merged.headerLine2,
      headerLine3: merged.headerLine3,
      footerLine1: merged.footerLine1,
      footerLine2: merged.footerLine2,
      footerLine3: merged.footerLine3,
      footerLine4: merged.footerLine4,
      footerLine5: merged.footerLine5,
      headerBlockText: merged.headerBlockText,
      headerFontSize: formatReceiptBlockFontPxForStorage(merged.headerFontSize),
      headerBlockBold: merged.headerBlockBold,
      subHeaderBlockText: input.subHeaderBlockText?.trim() ? input.subHeaderBlockText : null,
      subHeaderFontSize: formatReceiptBlockFontPxForStorage(
        normalizeReceiptBlockFontPx(input.subHeaderFontSize)
      ),
      subHeaderBlockBold: input.subHeaderBlockBold,
      footerBlockText: merged.footerBlockText,
      footerFontSize: formatReceiptBlockFontPxForStorage(merged.footerFontSize),
      footerBlockBold: merged.footerBlockBold,
      infoBlockFontSize: formatReceiptBlockFontPxForStorage(
        normalizeInfoBlockFontPx(input.infoBlockFontSize)
      ),
      infoBlockBold: input.infoBlockBold,
      showAbbreviatedTaxTitle: input.showAbbreviatedTaxTitle,
      showVatIncludedMessage: input.showVatIncludedMessage,
    },
  })

  return toThermalDocumentLayoutView(row)
}
