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
    bangkokDate: "2026-06-03 – 2026-06-05",
    bangkokDateFrom: "2026-06-03",
    bangkokDateTo: "2026-06-05",
    generatedAt: "2026-06-26T08:16:00.000Z",
    staffId: "001",
    staffName: "Kiti Thengtrirat",
    branchCode: branch.code,
    branchName: branch.name,
    groupLines: [],
    paymentLines: [],
    dailyCashLines: [
      { salesDateYmd: "2026-06-03", cashAmount: 12000, ticketCount: 20 },
      { salesDateYmd: "2026-06-04", cashAmount: 18240, ticketCount: 18 },
      { salesDateYmd: "2026-06-05", cashAmount: 14000, ticketCount: 15 },
    ],
    grandTotal: 44240,
    saleCount: 53,
    refundCount: 0,
    refundTotal: 0,
    netTotal: 44240,
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
