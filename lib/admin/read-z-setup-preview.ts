import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import type { ThermalDocumentLayoutView } from "@/lib/thermal/types"
import { buildTicketLayout } from "@/lib/thermal/build-ticket-layout"
import { COMPANY_TAX_BRANCH_CODE } from "@/lib/thermal/company-tax"
import type { ReceiptSetupBranchOption } from "@/lib/admin/receipt-setup-preview"

export function buildReadZSetupSampleReport(
  branch: ReceiptSetupBranchOption
): ReadReportPayload {
  return {
    mode: "Z",
    bangkokDate: "2026-06-07",
    generatedAt: "2026-06-07T10:00:00.000Z",
    staffId: "103",
    staffName: "Somsak",
    branchCode: branch.code,
    branchName: branch.name,
    groupLines: [{ lineKey: "g1", displayLeft: "010-Sample Group", qty: 2, amount: 120 }],
    paymentLines: [{ key: "CASH", label: "Cash", amount: 120 }],
    grandTotal: 120,
    saleCount: 2,
    refundCount: 1,
    refundTotal: 20,
    netTotal: 100,
  }
}

export function buildReadZSetupTicketLayout(input: {
  layout: ThermalDocumentLayoutView
  branch: ReceiptSetupBranchOption
  companyTaxId: string | null
  report?: ReadReportPayload
}) {
  const report = input.report ?? buildReadZSetupSampleReport(input.branch)
  const machineNo =
    input.branch.code === COMPANY_TAX_BRANCH_CODE ? null : input.branch.taxId?.trim() || null
  return buildTicketLayout({
    documentType: "READ_Z",
    report,
    layout: input.layout,
    identityContext: {
      branchPhone: input.branch.phone,
      companyTaxId: input.companyTaxId,
      machineTaxId: machineNo,
    },
  })
}

/** @deprecated Use buildReadZSetupTicketLayout */
export function buildReadZSetupPreviewParts(input: {
  layout: ThermalDocumentLayoutView
  branch: ReceiptSetupBranchOption
  companyTaxId: string | null
  report?: ReadReportPayload
}) {
  return buildReadZSetupTicketLayout(input)
}
