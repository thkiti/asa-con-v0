import type { BankStatementStatus } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"

export type { BankStatementStatus }

export type BankStatementBankAccountRef = {
  id: string
  bankName: string
  accountNumber: string
  accountName: string
  currencyCode: string
  glAccount: {
    id: string
    code: string
    name: string
  }
}

export type BankStatementLineRow = {
  id: string
  lineNo: number
  transactionDate: string
  description: string
  chequeNumber: string | null
  depositAmount: string | null
  withdrawalAmount: string | null
  runningBalance: string
}

export type BankStatementRow = {
  id: string
  legalEntityCode: DocumentEntityCode
  bankAccountId: string
  bankAccount: BankStatementBankAccountRef
  periodKey: string
  statementNo: string
  statementDate: string
  openingBalance: string
  closingBalance: string
  status: BankStatementStatus
  createdAt: string
  updatedAt: string
  createdByStaffId: string | null
  updatedByStaffId: string | null
}

export type BankStatementDetail = BankStatementRow & {
  lines: BankStatementLineRow[]
  validation: BankStatementValidationResult
}

export type BankStatementValidationResult = {
  isValid: boolean
  openingBalance: string
  totalDeposits: string
  totalWithdrawals: string
  computedClosingBalance: string
  declaredClosingBalance: string
  message: string
}

export type BankStatementListFilter = {
  legalEntityCode: DocumentEntityCode
  periodKey?: string
  bankAccountId?: string
  status?: BankStatementStatus
  search?: string
}

export type BankStatementListResult = {
  items: BankStatementRow[]
  total: number
}

export type BankStatementLineInput = {
  lineNo?: number
  transactionDate: string
  description: string
  chequeNumber?: string | null
  depositAmount?: string | null
  withdrawalAmount?: string | null
  runningBalance: string
}

export type CreateBankStatementInput = {
  legalEntityCode: DocumentEntityCode
  bankAccountId: string
  periodKey: string
  statementDate: string
  openingBalance: string
  closingBalance: string
  statementNo?: string
  status?: BankStatementStatus
  lines?: BankStatementLineInput[]
  actorStaffId?: string | null
}

export type UpdateBankStatementInput = {
  id: string
  legalEntityCode: DocumentEntityCode
  bankAccountId?: string
  periodKey?: string
  statementDate?: string
  openingBalance?: string
  closingBalance?: string
  statementNo?: string
  status?: BankStatementStatus
  lines?: BankStatementLineInput[]
  actorStaffId?: string | null
}
