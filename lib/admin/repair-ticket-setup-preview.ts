import type { RepairTicketSlipInput } from "@/lib/thermal/build-repair-ticket-slip"
import type { ThermalDocumentLayoutView } from "@/lib/thermal/types"
import { buildTicketLayout } from "@/lib/thermal/build-ticket-layout"
import { COMPANY_TAX_BRANCH_CODE } from "@/lib/thermal/company-tax"
import type { ReceiptSetupBranchOption } from "@/lib/admin/receipt-setup-preview"

export function buildRepairTicketSetupSampleInput(
  branch: ReceiptSetupBranchOption
): RepairTicketSlipInput {
  return {
    ticketNo: `RT-${branch.code}-202606-0001`,
    branchName: branch.name,
    issuedAt: "2026-06-04T12:00:00.000Z",
    fileNames: ["photo-1.jpg", "photo-2.jpg"],
  }
}

export function buildRepairTicketSetupTicketLayout(input: {
  layout: ThermalDocumentLayoutView
  branch: ReceiptSetupBranchOption
  companyTaxId: string | null
  ticket?: RepairTicketSlipInput
}) {
  const ticket = input.ticket ?? buildRepairTicketSetupSampleInput(input.branch)
  const machineNo =
    input.branch.code === COMPANY_TAX_BRANCH_CODE ? null : input.branch.taxId?.trim() || null
  return buildTicketLayout({
    documentType: "REPAIR_TICKET",
    ticket,
    layout: input.layout,
    branchCode: input.branch.code,
    staffId: "103",
    staffName: "Somsak",
    identityContext: {
      branchPhone: input.branch.phone,
      companyTaxId: input.companyTaxId,
      machineTaxId: machineNo,
    },
  })
}

/** @deprecated Use buildRepairTicketSetupTicketLayout */
export function buildRepairTicketSetupPreviewParts(input: {
  layout: ThermalDocumentLayoutView
  branch: ReceiptSetupBranchOption
  companyTaxId: string | null
  ticket?: RepairTicketSlipInput
}) {
  return buildRepairTicketSetupTicketLayout(input)
}
