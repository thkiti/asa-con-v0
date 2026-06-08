import { buildReceiptSlipText as buildThermalReceiptSlipText } from "@/lib/thermal/build-receipt-slip"
import {
  THERMAL_AMOUNT_COL_WIDTH as RECEIPT_AMOUNT_COL_WIDTH,
  THERMAL_AMOUNT_MIN_GAP as RECEIPT_AMOUNT_MIN_GAP,
  THERMAL_COLUMNS as RECEIPT_COLUMNS,
  THERMAL_NAME_ELLIPSIS as RECEIPT_NAME_ELLIPSIS,
  THERMAL_PRINT_COLUMNS as RECEIPT_PRINT_COLUMNS,
  centerThermalLine as centerReceiptLine,
  formatThermalAmountLine as formatReceiptAmountLine,
  formatThermalCompactUnitPrice as formatReceiptCompactUnitPrice,
  formatThermalDateTime as formatReceiptDateTime,
  padThermalLine as padReceiptLine,
  repeatThermalChar as repeatReceiptChar,
  truncateThermalText as truncateReceiptText,
  wrapThermalTextLines as wrapReceiptTextLines,
} from "@/lib/thermal/format"
import { receiptSettingsToThermalLayout, resolveThermalLayout } from "@/lib/thermal/layout"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import type { ThermalLayoutMap } from "@/lib/thermal/types"
import type { ReceiptPrintContext } from "./receipt-print-context"
import { formatReceiptMoney } from "./receipt-money"
export { formatReceiptMoney } from "./receipt-money"
import { calculateReceiptVat7FromInclusive } from "./receipt-vat-display"

export {
  RECEIPT_COLUMNS,
  RECEIPT_AMOUNT_COL_WIDTH,
  RECEIPT_PRINT_COLUMNS,
  RECEIPT_NAME_ELLIPSIS,
  RECEIPT_AMOUNT_MIN_GAP,
  formatReceiptCompactUnitPrice,
  truncateReceiptText,
  formatReceiptAmountLine,
  padReceiptLine,
  centerReceiptLine,
  repeatReceiptChar,
  formatReceiptDateTime,
  wrapReceiptTextLines,
}

function receiptLayoutFromContext(receipt: ReceiptPrintContext) {
  const fromSettings = receiptSettingsToThermalLayout(receipt.settings)
  return {
    ...fromSettings,
    headerLine1: fromSettings.headerLine1 ?? receipt.companyDisplayName,
  }
}

export function computeReceiptMaxAmountWidth(receipt: ReceiptPrintContext): number {
  const amounts: string[] = []
  for (const item of receipt.lines) {
    amounts.push(formatReceiptMoney(item.lineTotal))
  }
  amounts.push(
    formatReceiptMoney(receipt.total),
    calculateReceiptVat7FromInclusive(receipt.total),
    formatReceiptMoney(receipt.cashAmount),
    formatReceiptMoney(receipt.change)
  )
  return Math.max(4, ...amounts.map((a) => a.length))
}

export function formatReceiptItemDetailLine(
  item: { code: string; qty: number; unitPrice: string; lineTotal: string },
  width = RECEIPT_COLUMNS,
  amountWidth: number
): string {
  const code = item.code.trim() || "-"
  const left = `${code}=${item.qty}x${formatReceiptCompactUnitPrice(item.unitPrice)}`
  return formatReceiptAmountLine(
    left,
    formatReceiptMoney(item.lineTotal),
    width,
    amountWidth
  )
}

export function wrapReceiptProductName(name: string, width = RECEIPT_COLUMNS): string[] {
  const line = truncateReceiptText(name, width)
  return line ? [line] : []
}

export function buildReceiptSlipText(receipt: ReceiptPrintContext): string {
  if (receipt.thermalLayout) {
    return buildThermalReceiptSlipText(receipt, receipt.thermalLayout)
  }
  const layouts: ThermalLayoutMap =
    receipt.thermalLayouts ??
    ({
      ...DEFAULT_THERMAL_LAYOUTS,
      RECEIPT: receiptLayoutFromContext(receipt),
    } as ThermalLayoutMap)
  return buildThermalReceiptSlipText(receipt, resolveThermalLayout("RECEIPT", layouts))
}
