import { formatCashierDisplay } from "@/lib/pos/format-cashier-display"
import type { RefundPreviewResult } from "@/lib/pos/refund"
import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import { resolveRefundReason } from "@/lib/pos/refund-reasons"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import type { ResolvedThermalLayout } from "@/lib/thermal/types"
import type { PosTerminalSession } from "@/lib/pos-ui/types"

export function resolveRefundPreviewAmount(
  amountInput: string,
  preview: RefundPreviewResult
): string {
  const trimmed = amountInput.trim()
  if (trimmed) return trimmed
  return preview.remainingRefundable
}

/** Draft refund ticket context for POS preview — updated with real refund no after save. */
export function buildRefundPreviewSlipContext(input: {
  preview: RefundPreviewResult
  amount: string
  reasonCode: string
  session: Pick<PosTerminalSession, "branchId" | "branchCode" | "branchName" | "staffId" | "name">
  receiptThermalLayout: ResolvedThermalLayout
  refundThermalLayout: ResolvedThermalLayout
}): RefundReceiptPrintContext | null {
  const resolvedReason = resolveRefundReason(input.reasonCode)
  if (!resolvedReason) return null

  const thermalLayouts = {
    ...DEFAULT_THERMAL_LAYOUTS,
    RECEIPT: input.receiptThermalLayout,
    REFUND: input.refundThermalLayout,
  }

  return {
    refundId: "preview",
    refundNo: "PREVIEW",
    issuedAt: new Date().toISOString(),
    kind: "SALE_LINKED",
    amount: resolveRefundPreviewAmount(input.amount, input.preview),
    reason: resolvedReason.reason,
    branchId: input.session.branchId,
    branchCode: input.session.branchCode,
    branchName: input.session.branchName,
    branchAddress: null,
    branchPhone: null,
    companyDisplayName: input.receiptThermalLayout.headerLine1,
    companyTaxId: null,
    machineTaxId: null,
    cashierDisplay: formatCashierDisplay(input.session.staffId, input.session.name),
    saleId: input.preview.saleId,
    originalReceiptId: input.preview.originalReceiptId,
    originalReceiptNo: input.preview.originalReceiptNo,
    originalReceiptTotal: input.preview.saleTotal,
    thermalLayouts,
    thermalLayout: input.refundThermalLayout,
  }
}
