import type { DocumentEntityCode } from "@/lib/legal-entity/constants"

export type BankAccountGlRef = {
  id: string
  code: string
  name: string
}

export type BankAccountRow = {
  id: string
  legalEntityCode: DocumentEntityCode
  bankName: string
  accountNumber: string
  accountName: string
  currencyCode: string
  glAccount: BankAccountGlRef
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type BankAccountListFilter = {
  legalEntityCode: DocumentEntityCode
  /** @deprecated use activeFilter */
  activeOnly?: boolean
  activeFilter?: BankAccountActiveFilter
}

export type BankAccountListResult = {
  items: BankAccountRow[]
  total: number
}

export type CreateBankAccountInput = {
  legalEntityCode: DocumentEntityCode
  bankName: string
  accountNumber: string
  accountName: string
  currencyCode?: string
  glAccountId?: string
  glAccountCode?: string
  isActive?: boolean
}

export type UpdateBankAccountInput = {
  id: string
  legalEntityCode: DocumentEntityCode
  bankName?: string
  accountNumber?: string
  accountName?: string
  currencyCode?: string
  glAccountId?: string
  glAccountCode?: string
  isActive?: boolean
}

export type BankAccountActiveFilter = "active" | "inactive" | "all"
