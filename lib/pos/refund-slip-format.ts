import { buildRefundSlipText as buildThermalRefundSlipText } from "@/lib/thermal/build-refund-slip"
import {
  THERMAL_COLUMNS as RECEIPT_COLUMNS,
  centerThermalLine as centerReceiptLine,
  formatThermalAmountLine as formatReceiptAmountLine,
  formatThermalDateTime as formatReceiptDateTime,
  padThermalLine as padReceiptLine,
  repeatThermalChar as repeatReceiptChar,
  truncateThermalText as truncateReceiptText,
  wrapThermalTextLines as wrapReceiptTextLines,
} from "@/lib/thermal/format"
import { receiptSettingsToThermalLayout, resolveThermalLayout } from "@/lib/thermal/layout"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import type { ThermalLayoutMap } from "@/lib/thermal/types"
import type { RefundReceiptPrintContext } from "./refund-receipt-print-context"

export {
  RECEIPT_COLUMNS,
  centerReceiptLine,
  formatReceiptAmountLine,
  formatReceiptDateTime,
  padReceiptLine,
  repeatReceiptChar,
  truncateReceiptText,
  wrapReceiptTextLines,
}

export function buildRefundSlipText(context: RefundReceiptPrintContext): string {
  if (context.thermalLayout) {
    return buildThermalRefundSlipText(context, context.thermalLayout)
  }
  const layouts: ThermalLayoutMap =
    context.thermalLayouts ??
    ({
      ...DEFAULT_THERMAL_LAYOUTS,
      RECEIPT: receiptSettingsToThermalLayout(context.settings),
    } as ThermalLayoutMap)
  return buildThermalRefundSlipText(context, resolveThermalLayout("REFUND", layouts))
}
