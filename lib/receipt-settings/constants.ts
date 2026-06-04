import { BOOTSTRAP_HO_BRANCH_CODE } from "@/lib/import/constants"

/** Branch row whose taxId is the company tax ID on all receipts. */
export const COMPANY_TAX_BRANCH_CODE = BOOTSTRAP_HO_BRANCH_CODE

export const RECEIPT_PRINT_SETTINGS_ID = "default"

export const RECEIPT_SETTINGS_MAX = {
  companyDisplayName: 80,
  footerLine: 200,
  address: 200,
  phone: 40,
  taxId: 32,
} as const
