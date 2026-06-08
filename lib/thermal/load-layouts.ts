import type { PrismaClient, ThermalDocumentLayout } from "@/generated/prisma/client"
import { loadReceiptPrintSettings } from "@/lib/receipt-settings/load-settings"
import {
  buildThermalLayoutMap,
  receiptSettingsToThermalLayout,
} from "./layout"
import { DEFAULT_THERMAL_LAYOUTS } from "./layout-defaults"
import type { ThermalDocumentLayoutView, ThermalDocumentType, ThermalLayoutMap } from "./types"

type LayoutDb = Pick<PrismaClient, "thermalDocumentLayout" | "receiptPrintSettings">

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

/** Load all thermal layouts; RECEIPT falls back to ReceiptPrintSettings when row missing. */
export async function loadThermalLayouts(db: LayoutDb): Promise<ThermalLayoutMap> {
  const [rows, receiptSettings] = await Promise.all([
    db.thermalDocumentLayout.findMany(),
    loadReceiptPrintSettings(db),
  ])

  const byType: Partial<Record<ThermalDocumentType, ThermalDocumentLayoutView>> = {}
  for (const row of rows) {
    const view = toThermalDocumentLayoutView(row)
    byType[view.documentType] = view
  }

  if (!byType.RECEIPT) {
    byType.RECEIPT = receiptSettingsToThermalLayout(receiptSettings)
  }

  for (const type of Object.keys(DEFAULT_THERMAL_LAYOUTS) as ThermalDocumentType[]) {
    if (!byType[type]) {
      byType[type] = { ...DEFAULT_THERMAL_LAYOUTS[type] }
    }
  }

  return buildThermalLayoutMap(byType)
}

export { toThermalDocumentLayoutView }
