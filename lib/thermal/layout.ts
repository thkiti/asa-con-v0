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

const REFUND_INHERIT_BLOCK_FIELDS = [
  "headerBlockText",
  "footerBlockText",
  "subHeaderBlockText",
  "headerFontSize",
  "footerFontSize",
  "subHeaderFontSize",
  "headerBlockBold",
  "footerBlockBold",
  "subHeaderBlockBold",
] as const

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

  for (const field of REFUND_INHERIT_BLOCK_FIELDS) {
    if (field === "headerFontSize") {
      if (isEmptyLayoutValue(refund.headerBlockText)) {
        merged.headerFontSize = receipt.headerFontSize
        merged.headerBlockBold = receipt.headerBlockBold
      }
      continue
    }
    if (field === "footerFontSize") {
      if (isEmptyLayoutValue(refund.footerBlockText)) {
        merged.footerFontSize = receipt.footerFontSize
        merged.footerBlockBold = receipt.footerBlockBold
      }
      continue
    }
    if (field === "subHeaderFontSize") {
      if (isEmptyLayoutValue(refund.subHeaderBlockText)) {
        merged.subHeaderFontSize = receipt.subHeaderFontSize
        merged.subHeaderBlockBold = receipt.subHeaderBlockBold
      }
      continue
    }
    if (field === "headerBlockBold") {
      if (isEmptyLayoutValue(refund.headerBlockText)) {
        merged.headerBlockBold = receipt.headerBlockBold
      }
      continue
    }
    if (field === "footerBlockBold") {
      if (isEmptyLayoutValue(refund.footerBlockText)) {
        merged.footerBlockBold = receipt.footerBlockBold
      }
      continue
    }
    if (field === "subHeaderBlockBold") {
      if (isEmptyLayoutValue(refund.subHeaderBlockText)) {
        merged.subHeaderBlockBold = receipt.subHeaderBlockBold
      }
      continue
    }
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
