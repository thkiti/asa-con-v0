import type { PeriodReconciliationStatus } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import type { PeriodReconciliationWorkflowTimestamps } from "../period-reconciliation-types"

export type BankReconciliationGlAccountRef = {
  id: string
  code: string
  name: string
}

export type BankReconciliationRow = {
  id: string
  legalEntityCode: DocumentEntityCode
  periodKey: string
  branchId: string | null
  glAccount: BankReconciliationGlAccountRef
  glBalance: string
  bankStatementBalance: string
  outstandingDeposits: string
  outstandingPayments: string
  bankCharges: string
  interest: string
  adjustments: string
  reconciledBalance: string
  variance: string
  note: string | null
  evidenceNote: string | null
  status: PeriodReconciliationStatus
  workflow: PeriodReconciliationWorkflowTimestamps
  createdAt: string
  updatedAt: string
  createdByStaffId: string
  updatedByStaffId: string | null
}

export type BankReconciliationListFilter = {
  legalEntityCode: DocumentEntityCode
  periodKey?: string
  branchId?: string
  glAccountId?: string
  status?: PeriodReconciliationStatus
  limit?: number
  offset?: number
}

export type BankReconciliationListResult = {
  items: BankReconciliationRow[]
  total: number
}

export type UpsertBankReconciliationInput = {
  legalEntityCode: DocumentEntityCode
  periodKey: string
  branchId?: string | null
  glAccountId?: string
  glAccountCode?: string
  bankStatementBalance: string | number
  outstandingDeposits?: string | number
  outstandingPayments?: string | number
  bankCharges?: string | number
  interest?: string | number
  adjustments?: string | number
  note?: string | null
  evidenceNote?: string | null
  actorStaffId: string
}

export type UpdateBankReconciliationDraftInput = {
  id: string
  legalEntityCode: DocumentEntityCode
  bankStatementBalance?: string | number
  outstandingDeposits?: string | number
  outstandingPayments?: string | number
  bankCharges?: string | number
  interest?: string | number
  adjustments?: string | number
  note?: string | null
  evidenceNote?: string | null
  actorStaffId: string
}

export type BankReconciliationWorkflowInput = {
  id: string
  legalEntityCode: DocumentEntityCode
  actorStaffId: string
}
