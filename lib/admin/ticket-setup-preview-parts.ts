import type { ReceiptSetupBranchOption } from "@/lib/admin/receipt-setup-preview"
import { COMPANY_TAX_BRANCH_CODE } from "@/lib/thermal/company-tax"
import { buildSlipIdentityParts } from "@/lib/thermal/receipt-slip-identity"
import {
  resolveFooterBlockLines,
  resolveHeaderBlockLines,
  resolveSubHeaderBlockLines,
} from "@/lib/thermal/receipt-layout-blocks"
import type { ReceiptSlipRefStaff } from "@/lib/thermal/build-receipt-slip"
import { buildTicketSetupTransactionPreview } from "@/lib/admin/ticket-setup-transaction-preview"
import type { ReceiptBlockFontPx } from "@/lib/thermal/receipt-block-font-size"
import type { ThermalDocumentLayoutView, ThermalDocumentType } from "@/lib/thermal/types"

export type TicketSetupPreviewParts = {
  headerLines: string[]
  headerFontSize: ReceiptBlockFontPx
  headerBold: boolean
  subHeaderLines: string[]
  subHeaderFontSize: ReceiptBlockFontPx
  subHeaderBold: boolean
  identityBeforeMachineLines: string[]
  machineTaxId: string | null
  identityAfterMachineLines: string[]
  infoBlockFontSize: ReceiptBlockFontPx
  infoBlockBold: boolean
  refStaff: ReceiptSlipRefStaff
  bodyText: string
  footerLines: string[]
  footerFontSize: ReceiptBlockFontPx
  footerBold: boolean
  ackText?: string
}

export function buildTicketSetupIdentityFromBranch(input: {
  branch: ReceiptSetupBranchOption
  companyTaxId: string | null
}) {
  const { branch, companyTaxId } = input
  const machineNo =
    branch.code === COMPANY_TAX_BRANCH_CODE ? null : branch.taxId?.trim() || null

  return buildSlipIdentityParts({
    branchCode: branch.code,
    branchName: branch.name,
    branchPhone: branch.phone,
    machineTaxId: machineNo,
    companyTaxId,
  })
}

export function resolveTicketSetupLayoutParts(
  layout: ThermalDocumentLayoutView
): Pick<
  TicketSetupPreviewParts,
  | "headerLines"
  | "headerFontSize"
  | "headerBold"
  | "subHeaderLines"
  | "subHeaderFontSize"
  | "subHeaderBold"
  | "footerLines"
  | "footerFontSize"
  | "footerBold"
  | "infoBlockFontSize"
  | "infoBlockBold"
> {
  return {
    headerLines: resolveHeaderBlockLines(layout),
    headerFontSize: layout.headerFontSize,
    headerBold: layout.headerBlockBold,
    subHeaderLines: resolveSubHeaderBlockLines(layout),
    subHeaderFontSize: layout.subHeaderFontSize,
    subHeaderBold: layout.subHeaderBlockBold,
    footerLines: resolveFooterBlockLines(layout),
    footerFontSize: layout.footerFontSize,
    footerBold: layout.footerBlockBold,
    infoBlockFontSize: layout.infoBlockFontSize,
    infoBlockBold: layout.infoBlockBold,
  }
}

export function mergeTicketSetupPreviewParts(input: {
  layout: ThermalDocumentLayoutView
  branch: ReceiptSetupBranchOption
  companyTaxId: string | null
  bodyText: string
  ackText?: string
  documentType: ThermalDocumentType
}): TicketSetupPreviewParts {
  const identity = buildTicketSetupIdentityFromBranch({
    branch: input.branch,
    companyTaxId: input.companyTaxId,
  })
  const transaction = buildTicketSetupTransactionPreview(input.documentType, input.branch.code)

  return {
    ...resolveTicketSetupLayoutParts(input.layout),
    identityBeforeMachineLines: identity.beforeMachineLines,
    machineTaxId: identity.machineTaxId,
    identityAfterMachineLines: identity.afterMachineLines,
    refStaff: {
      refLine: `Ref. ${transaction.refDocumentNo}`,
      dateLine: transaction.dateLine,
      staffLabel: transaction.staffLabel,
      staffValue: transaction.staffValue,
    },
    bodyText: input.bodyText,
    ackText: input.ackText,
  }
}

/** Preview-only — drop leading branch line when shop identity block already shows branch. */
export function stripLeadingBranchLineFromBodyText(
  bodyText: string,
  branch: ReceiptSetupBranchOption
): string {
  const lines = bodyText.split("\n")
  if (lines.length === 0) return bodyText

  const first = lines[0]?.trim() ?? ""
  const branchLabel = `${branch.code} ${branch.name}`.trim()
  const matchesBranch =
    first === branch.name.trim() ||
    first === branch.code.trim() ||
    first === branchLabel ||
    first.includes(branch.name.trim())

  if (!matchesBranch) return bodyText

  let index = 1
  while (index < lines.length && !lines[index]?.trim()) {
    index += 1
  }
  return lines.slice(index).join("\n")
}
