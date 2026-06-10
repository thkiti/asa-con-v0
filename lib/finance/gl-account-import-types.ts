import type { GlAccountType } from "@/generated/prisma/client"
import type { NormalBalance } from "./gl-account-normal-balance"
import type { GlAccountImportErrorCode } from "./gl-account-import-errors"

export const GL_ACCOUNT_IMPORT_MAX_ROWS = 10_000
export const GL_ACCOUNT_CODE_MAX_LENGTH = 32
export const GL_ACCOUNT_NAME_MAX_LENGTH = 200

export const GL_ACCOUNT_CSV_REQUIRED_HEADERS = [
  "accountcode",
  "accountname",
  "accounttype",
  "normalbalance",
] as const

export const GL_ACCOUNT_CSV_TEMPLATE_HEADER =
  "accountCode,accountName,accountType,normalBalance,parentAccountCode,isActive"

export const GL_ACCOUNT_CSV_TEMPLATE_EXAMPLE =
  "1100,Cash on hand,ASSET,DEBIT,1000,true"

export type GlAccountCsvRow = {
  rowNumber: number
  accountCode: string
  accountName: string
  accountType: GlAccountType
  normalBalance: NormalBalance
  parentAccountCode: string | null
  isActive: boolean | null
}

export type GlAccountImportErrorRow = {
  rowNumber?: number
  accountCode?: string
  code: GlAccountImportErrorCode
  message: string
}

export type GlAccountPreviewAction = "INSERT" | "UPDATE" | "BLOCKED"

export type GlAccountFieldChange = {
  field: "accountName" | "accountType" | "parentAccountCode" | "isActive"
  before: string
  after: string
}

export type GlAccountPreviewRow = {
  rowNumber: number
  accountCode: string
  accountName: string
  accountType: GlAccountType
  normalBalance: NormalBalance
  parentAccountCode: string | null
  isActive: boolean
  action: GlAccountPreviewAction
  blockReason?: GlAccountImportErrorCode
  changes?: GlAccountFieldChange[]
  warnings?: string[]
}

export type OperationalCodeCheck = {
  code: string
  found: boolean
  isActive: boolean
}

export type GlAccountImportPreview = {
  summary: {
    totalRows: number
    insertCount: number
    updateCount: number
    blockedCount: number
    errorCount: number
    warningCount: number
  }
  inserts: GlAccountPreviewRow[]
  updates: GlAccountPreviewRow[]
  blocked: GlAccountPreviewRow[]
  errors: GlAccountImportErrorRow[]
  warnings: string[]
  operationalCodesCheck: OperationalCodeCheck[]
}

export type GlAccountImportApplyResult = {
  inserted: number
  updated: number
  warnings: string[]
  operationalCodesCheck: OperationalCodeCheck[]
}
