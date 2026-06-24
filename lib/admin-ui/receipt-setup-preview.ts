import type { BranchListItem } from "@/lib/master/types"
import {
  buildReceiptSetupPreviewData,
  buildReceiptSetupPrintSampleText,
  buildReceiptSetupSampleReceiptContext,
  buildReceiptSetupTicketLayout,
  formatReceiptSetupBranchLabel,
  isReceiptSetupPreviewBranch,
  RECEIPT_SETUP_PREVIEW_MONO_COLUMNS,
  type ReceiptSetupBranchOption,
  type ReceiptSetupPreviewData,
} from "@/lib/admin/receipt-setup-preview"
import { COMPANY_TAX_BRANCH_CODE } from "@/lib/thermal/company-tax"

export function mapBranchesForReceiptSetupPreview(
  items: BranchListItem[]
): ReceiptSetupBranchOption[] {
  return items
    .filter((item) => isReceiptSetupPreviewBranch({
      id: item.id,
      code: item.code,
      name: item.name,
      phone: item.phone,
      taxId: item.taxId,
      type: item.type,
    }))
    .map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      phone: item.phone,
      taxId: item.taxId,
      type: item.type,
    }))
    .sort((a, b) => a.code.localeCompare(b.code))
}

export function pickCompanyTaxIdFromBranches(
  branches: ReceiptSetupBranchOption[]
): string | null {
  const ho = branches.find((b) => b.code === COMPANY_TAX_BRANCH_CODE)
  return ho?.taxId?.trim() || null
}

export {
  formatReceiptSetupBranchLabel,
  buildReceiptSetupPreviewData,
  buildReceiptSetupPrintSampleText,
  buildReceiptSetupSampleReceiptContext,
  buildReceiptSetupTicketLayout,
  RECEIPT_SETUP_PREVIEW_MONO_COLUMNS,
}
export type { ReceiptSetupBranchOption, ReceiptSetupPreviewData }

export {
  THERMAL_PAPER_WIDTH_MM,
  THERMAL_PRINTABLE_WIDTH_MM,
} from "@/lib/thermal/thermal-paper"
