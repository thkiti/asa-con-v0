import type { ReceiptPrintContext } from "@/lib/pos/receipt-print-context"
import type { ReceiptLookupRow } from "@/lib/pos/receipt-lookup-types"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import type { ResolvedThermalLayout } from "@/lib/thermal/types"

/** Build sale receipt print context from lookup row + POS thermal layout. */
export function buildReceiptLookupSlipContext(
  row: ReceiptLookupRow,
  receiptThermalLayout: ResolvedThermalLayout
): ReceiptPrintContext {
  const thermalLayouts = {
    ...DEFAULT_THERMAL_LAYOUTS,
    RECEIPT: receiptThermalLayout,
  }

  return {
    saleId: row.saleId,
    receiptNo: row.receiptNo,
    issuedAt: row.issuedAt,
    branchCode: row.branchCode,
    branchName: row.branchName,
    branchAddress: row.branchAddress,
    branchPhone: row.branchPhone,
    companyDisplayName: receiptThermalLayout.headerLine1,
    companyTaxId: row.companyTaxId,
    machineTaxId: row.machineTaxId,
    cashierDisplay: row.staffDisplay,
    lines: row.items.map((item) => ({
      code: item.code,
      name: item.name,
      qty: item.qty,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    total: row.total,
    paymentMethod: row.paymentMethod,
    cashAmount: row.cashAmount,
    change: row.change,
    thermalLayouts,
    thermalLayout: receiptThermalLayout,
  }
}
