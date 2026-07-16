import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import { buildRefundSlipText } from "@/lib/pos/refund-slip-format"
import { formatReceiptMoney } from "@/lib/pos/receipt-money"
import { RECEIPT_SETUP_PREVIEW_MONO_COLUMNS } from "@/lib/admin/receipt-setup-preview"
import { resolveThermalLayout } from "@/lib/thermal/layout"
import { buildTicketLayout } from "@/lib/thermal/build-ticket-layout"
import { COMPANY_TAX_BRANCH_CODE } from "@/lib/thermal/company-tax"
import { formatThermalDateTime } from "@/lib/thermal/format"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import type { ReceiptSetupBranchOption } from "@/lib/admin/receipt-setup-preview"
import type { ThermalDocumentLayoutView, ThermalLayoutMap } from "@/lib/thermal/types"

export type RefundSetupPreviewBodyData = {
  title: string
  refundNo: string
  originalReceiptNo: string | null
  date: string
  staff: string | null
  type: string
  reason: string | null
  amount: string
}

function formatRefundKindLabel(kind: RefundReceiptPrintContext["kind"]): string {
  return kind === "SALE_LINKED"
    ? "SALE LINKED"
    : kind === "LEGACY_HISTORICAL"
      ? "LEGACY HISTORICAL"
      : "GOODWILL"
}

function shouldStackLabelValue(label: string, value: string): boolean {
  return value.length > RECEIPT_SETUP_PREVIEW_MONO_COLUMNS - label.length - 1
}

export function buildRefundSetupPreviewBodyData(
  context: RefundReceiptPrintContext
): RefundSetupPreviewBodyData {
  return {
    title: "REFUND RECEIPT",
    refundNo: context.refundNo,
    originalReceiptNo:
      context.kind === "SALE_LINKED" && context.originalReceiptNo
        ? context.originalReceiptNo
        : null,
    date: formatThermalDateTime(context.issuedAt),
    staff: context.cashierDisplay,
    type: formatRefundKindLabel(context.kind),
    reason: context.reason?.trim() || null,
    amount: formatReceiptMoney(context.amount),
  }
}

export { shouldStackLabelValue as refundPreviewShouldStackLabelValue }

function buildMergedLayouts(input: {
  receiptLayout: ThermalDocumentLayoutView
  refundLayout: ThermalDocumentLayoutView
}): ThermalLayoutMap {
  return {
    ...DEFAULT_THERMAL_LAYOUTS,
    RECEIPT: input.receiptLayout,
    REFUND: input.refundLayout,
  }
}

export function buildRefundSetupSampleContext(input: {
  branch: ReceiptSetupBranchOption
  companyTaxId: string | null
}): RefundReceiptPrintContext {
  const { branch, companyTaxId } = input
  const machineNo =
    branch.code === COMPANY_TAX_BRANCH_CODE ? null : branch.taxId?.trim() || null
  const layouts = DEFAULT_THERMAL_LAYOUTS

  return {
    refundId: "preview",
    refundNo: `RF-${branch.code}-202606-0001`,
    issuedAt: "2026-06-04T12:30:00.000Z",
    kind: "SALE_LINKED",
    amount: "60.00",
    reason: "Sample reason",
    branchId: branch.id,
    branchCode: branch.code,
    branchName: branch.name,
    branchAddress: null,
    branchPhone: branch.phone,
    companyDisplayName: "ASA SERVICES",
    companyTaxId,
    machineTaxId: machineNo,
    cashierDisplay: "103-Somsak",
    saleId: "sale",
    originalReceiptId: "receipt",
    originalReceiptNo: `REC-${branch.code}-202606-0001`,
    originalReceiptTotal: "860.00",
    thermalLayouts: layouts,
    thermalLayout: layouts.REFUND,
  }
}

export function buildRefundSetupTicketLayout(input: {
  receiptLayout: ThermalDocumentLayoutView
  refundLayout: ThermalDocumentLayoutView
  refund: RefundReceiptPrintContext
}) {
  const layouts = buildMergedLayouts(input)
  const layout = resolveThermalLayout("REFUND", layouts)
  return buildTicketLayout({
    documentType: "REFUND",
    refund: { ...input.refund, thermalLayouts: layouts, thermalLayout: layout },
    layout,
  })
}

export function buildRefundSetupPreviewParts(input: {
  receiptLayout: ThermalDocumentLayoutView
  refundLayout: ThermalDocumentLayoutView
  refund: RefundReceiptPrintContext
}) {
  return buildRefundSetupTicketLayout(input)
}

export function buildRefundSetupPrintSampleText(input: {
  branch: ReceiptSetupBranchOption
  companyTaxId: string | null
  receiptLayout: ThermalDocumentLayoutView
  refundLayout: ThermalDocumentLayoutView
}): string {
  const layouts = buildMergedLayouts(input)
  return buildRefundSlipText({
    ...buildRefundSetupSampleContext({
      branch: input.branch,
      companyTaxId: input.companyTaxId,
    }),
    thermalLayouts: layouts,
  })
}

/** @deprecated Use buildRefundSetupPreviewParts with receiptLayout + refundLayout */
export function buildRefundSetupPreviewPartsFromMap(input: {
  layouts: ThermalLayoutMap
  refund: RefundReceiptPrintContext
}) {
  return buildRefundSetupPreviewParts({
    receiptLayout: input.layouts.RECEIPT,
    refundLayout: input.layouts.REFUND,
    refund: input.refund,
  })
}
