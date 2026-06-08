import type { ReceiptPrintSettingsView } from "@/lib/receipt-settings/types"
import { DEFAULT_THERMAL_LAYOUTS } from "./layout-defaults"
import type {
  ResolvedThermalLayout,
  ThermalDocumentLayoutView,
  ThermalDocumentType,
  ThermalLayoutMap,
} from "./types"

type LayoutStringField =
  | "headerLine1"
  | "headerLine2"
  | "headerLine3"
  | "footerLine1"
  | "footerLine2"
  | "footerLine3"
  | "footerLine4"
  | "footerLine5"

const REFUND_INHERIT_STRING_FIELDS: LayoutStringField[] = [
  "headerLine1",
  "headerLine2",
  "headerLine3",
  "footerLine1",
  "footerLine2",
  "footerLine3",
  "footerLine4",
  "footerLine5",
]

function isEmptyLayoutValue(value: string | null | undefined): boolean {
  return !value?.trim()
}

/**
 * REFUND rule: empty header/footer fields inherit from RECEIPT.
 * Admin may override REFUND fields independently when non-empty.
 */
export function mergeRefundLayoutFromReceipt(
  receipt: ThermalDocumentLayoutView,
  refund: ThermalDocumentLayoutView
): ResolvedThermalLayout {
  const merged: ResolvedThermalLayout = { ...refund }

  for (const field of REFUND_INHERIT_STRING_FIELDS) {
    if (isEmptyLayoutValue(refund[field])) {
      merged[field] = receipt[field]
    }
  }

  return merged
}

export function resolveThermalLayout(
  type: ThermalDocumentType,
  layouts: ThermalLayoutMap
): ResolvedThermalLayout {
  if (type === "REFUND") {
    return mergeRefundLayoutFromReceipt(layouts.RECEIPT, layouts.REFUND)
  }
  return layouts[type]
}

export function receiptSettingsToThermalLayout(
  settings: ReceiptPrintSettingsView
): ThermalDocumentLayoutView {
  return {
    documentType: "RECEIPT",
    headerLine1: settings.companyDisplayName,
    headerLine2: null,
    headerLine3: null,
    footerLine1: settings.footerLine1,
    footerLine2: settings.footerLine2,
    footerLine3: settings.footerLine3,
    footerLine4: settings.footerLine4,
    footerLine5: settings.footerLine5,
    showAbbreviatedTaxTitle: settings.showAbbreviatedTaxTitle,
    showVatIncludedMessage: settings.showVatIncludedMessage,
  }
}

export function thermalReceiptLayoutToSettings(
  layout: ThermalDocumentLayoutView
): ReceiptPrintSettingsView {
  return {
    companyDisplayName: layout.headerLine1,
    footerLine1: layout.footerLine1,
    footerLine2: layout.footerLine2,
    footerLine3: layout.footerLine3,
    footerLine4: layout.footerLine4,
    footerLine5: layout.footerLine5,
    showAbbreviatedTaxTitle: layout.showAbbreviatedTaxTitle,
    showVatIncludedMessage: layout.showVatIncludedMessage,
  }
}

export function buildThermalLayoutMap(
  rows: Partial<Record<ThermalDocumentType, ThermalDocumentLayoutView>>
): ThermalLayoutMap {
  return {
    RECEIPT: rows.RECEIPT ?? DEFAULT_THERMAL_LAYOUTS.RECEIPT,
    REFUND: rows.REFUND ?? DEFAULT_THERMAL_LAYOUTS.REFUND,
    COLLECTOR: rows.COLLECTOR ?? DEFAULT_THERMAL_LAYOUTS.COLLECTOR,
    REPAIR_TICKET: rows.REPAIR_TICKET ?? DEFAULT_THERMAL_LAYOUTS.REPAIR_TICKET,
    READ_Z: rows.READ_Z ?? DEFAULT_THERMAL_LAYOUTS.READ_Z,
  }
}
