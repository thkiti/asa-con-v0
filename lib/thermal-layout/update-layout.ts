import type { PrismaClient } from "@/generated/prisma/client"
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
  const row = await db.thermalDocumentLayout.upsert({
    where: { documentType },
    create: {
      documentType,
      headerLine1: input.headerLine1,
      headerLine2: input.headerLine2,
      headerLine3: input.headerLine3,
      footerLine1: input.footerLine1,
      footerLine2: input.footerLine2,
      footerLine3: input.footerLine3,
      footerLine4: input.footerLine4,
      footerLine5: input.footerLine5,
      showAbbreviatedTaxTitle: input.showAbbreviatedTaxTitle,
      showVatIncludedMessage: input.showVatIncludedMessage,
    },
    update: {
      headerLine1: input.headerLine1,
      headerLine2: input.headerLine2,
      headerLine3: input.headerLine3,
      footerLine1: input.footerLine1,
      footerLine2: input.footerLine2,
      footerLine3: input.footerLine3,
      footerLine4: input.footerLine4,
      footerLine5: input.footerLine5,
      showAbbreviatedTaxTitle: input.showAbbreviatedTaxTitle,
      showVatIncludedMessage: input.showVatIncludedMessage,
    },
  })

  return toThermalDocumentLayoutView(row)
}
