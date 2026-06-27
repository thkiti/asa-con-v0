import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import type { RefundLookupRow } from "@/lib/pos/refund-lookup-types"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import type { ResolvedThermalLayout } from "@/lib/thermal/types"

/** Build refund ticket print context from lookup row + POS thermal layouts. */
export function buildRefundLookupSlipContext(
  row: RefundLookupRow,
  receiptThermalLayout: ResolvedThermalLayout,
  refundThermalLayout: ResolvedThermalLayout
): RefundReceiptPrintContext {
  const thermalLayouts = {
    ...DEFAULT_THERMAL_LAYOUTS,
    RECEIPT: receiptThermalLayout,
    REFUND: refundThermalLayout,
  }

  return {
    refundId: row.refundId,
    refundNo: row.refundNo,
    issuedAt: row.issuedAt,
    kind: row.kind,
    amount: row.amount,
    reason: row.reason,
    branchId: row.branchId,
    branchCode: row.branchCode,
    branchName: row.branchName,
    branchAddress: row.branchAddress,
    branchPhone: row.branchPhone,
    companyDisplayName: receiptThermalLayout.headerLine1,
    companyTaxId: row.companyTaxId,
    machineTaxId: row.machineTaxId,
    cashierDisplay: row.cashierDisplay,
    saleId: row.saleId,
    originalReceiptId: row.originalReceiptId,
    originalReceiptNo: row.originalReceiptNo,
    originalReceiptTotal: row.originalReceiptTotal,
    thermalLayouts,
    thermalLayout: refundThermalLayout,
  }
}
