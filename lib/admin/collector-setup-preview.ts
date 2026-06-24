import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import type { ThermalDocumentLayoutView } from "@/lib/thermal/types"
import { buildTicketLayout } from "@/lib/thermal/build-ticket-layout"
import { COMPANY_TAX_BRANCH_CODE } from "@/lib/thermal/company-tax"
import type { ReceiptSetupBranchOption } from "@/lib/admin/receipt-setup-preview"
import { buildCollectorSlipText } from "@/lib/thermal/build-collector-slip"

export function buildCollectorSetupSampleReport(
  branch: ReceiptSetupBranchOption
): ReadReportPayload {
  return {
    mode: "COLLECT",
    bangkokDate: "2026-06-07",
    bangkokDateFrom: "2026-06-01",
    bangkokDateTo: "2026-06-07",
    generatedAt: "2026-06-07T10:00:00.000Z",
    staffId: "103",
    staffName: "Somsak",
    branchCode: branch.code,
    branchName: branch.name,
    groupLines: [{ lineKey: "g1", displayLeft: "010-Sample Group", qty: 2, amount: 120 }],
    paymentLines: [{ key: "CASH", label: "Cash", amount: 120 }],
    grandTotal: 120,
    saleCount: 2,
    refundCount: 0,
    refundTotal: 0,
    netTotal: 120,
  }
}

export function buildCollectorSetupTicketLayout(input: {
  layout: ThermalDocumentLayoutView
  branch: ReceiptSetupBranchOption
  companyTaxId: string | null
  report?: ReadReportPayload
}) {
  const report = input.report ?? buildCollectorSetupSampleReport(input.branch)
  const machineNo =
    input.branch.code === COMPANY_TAX_BRANCH_CODE ? null : input.branch.taxId?.trim() || null
  return buildTicketLayout({
    documentType: "COLLECTOR",
    report,
    layout: input.layout,
    identityContext: {
      branchPhone: input.branch.phone,
      companyTaxId: input.companyTaxId,
      machineTaxId: machineNo,
    },
  })
}

export function buildCollectorSetupPreviewParts(input: {
  layout: ThermalDocumentLayoutView
  branch: ReceiptSetupBranchOption
  companyTaxId: string | null
  report?: ReadReportPayload
}) {
  return buildCollectorSetupTicketLayout(input)
}

export function buildCollectorSetupPrintSampleText(input: {
  layout: ThermalDocumentLayoutView
  branch: ReceiptSetupBranchOption
  report?: ReadReportPayload
}): string {
  const report = input.report ?? buildCollectorSetupSampleReport(input.branch)
  return buildCollectorSlipText(report, input.layout)
}
