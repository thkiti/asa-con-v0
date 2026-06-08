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
import { resolveThermalLayout } from "@/lib/thermal/layout"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
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
  const layout =
    context.thermalLayout ??
    resolveThermalLayout("REFUND", context.thermalLayouts ?? DEFAULT_THERMAL_LAYOUTS)
  return buildThermalRefundSlipText(context, layout)
}
