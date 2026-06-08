import type { PrismaClient, ThermalDocumentLayout } from "@/generated/prisma/client"
import { buildThermalLayoutMap } from "./layout"
import { DEFAULT_THERMAL_LAYOUTS } from "./layout-defaults"
import type { ThermalDocumentLayoutView, ThermalDocumentType, ThermalLayoutMap } from "./types"

type LayoutDb = Pick<PrismaClient, "thermalDocumentLayout">

function toThermalDocumentLayoutView(row: ThermalDocumentLayout): ThermalDocumentLayoutView {
  return {
    documentType: row.documentType as ThermalDocumentType,
    headerLine1: row.headerLine1?.trim() || null,
    headerLine2: row.headerLine2?.trim() || null,
    headerLine3: row.headerLine3?.trim() || null,
    footerLine1: row.footerLine1?.trim() || null,
    footerLine2: row.footerLine2?.trim() || null,
    footerLine3: row.footerLine3?.trim() || null,
    footerLine4: row.footerLine4?.trim() || null,
    footerLine5: row.footerLine5?.trim() || null,
    showAbbreviatedTaxTitle: row.showAbbreviatedTaxTitle,
    showVatIncludedMessage: row.showVatIncludedMessage,
  }
}

export async function loadThermalLayouts(db: LayoutDb): Promise<ThermalLayoutMap> {
  const rows = await db.thermalDocumentLayout.findMany()

  const byType: Partial<Record<ThermalDocumentType, ThermalDocumentLayoutView>> = {}
  for (const row of rows) {
    const view = toThermalDocumentLayoutView(row)
    byType[view.documentType] = view
  }

  for (const type of Object.keys(DEFAULT_THERMAL_LAYOUTS) as ThermalDocumentType[]) {
    if (!byType[type]) {
      byType[type] = { ...DEFAULT_THERMAL_LAYOUTS[type] }
    }
  }

  return buildThermalLayoutMap(byType)
}

export { toThermalDocumentLayoutView }
