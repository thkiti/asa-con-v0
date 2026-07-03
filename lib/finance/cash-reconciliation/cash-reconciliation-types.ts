import type { PeriodReconciliationStatus } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import type { PeriodReconciliationWorkflowTimestamps } from "../period-reconciliation-types"

export type CashReconciliationGlAccountRef = {
  id: string
  code: string
  name: string
}

export type CashReconciliationRow = {
  id: string
  legalEntityCode: DocumentEntityCode
  periodKey: string
  branchId: string
  glAccount: CashReconciliationGlAccountRef
  expectedCash: string
  actualCountedCash: string
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

export type CashReconciliationListFilter = {
  legalEntityCode: DocumentEntityCode
  periodKey?: string
  branchId?: string
  glAccountId?: string
  status?: PeriodReconciliationStatus
  limit?: number
  offset?: number
}

export type CashReconciliationListResult = {
  items: CashReconciliationRow[]
  total: number
}

export type UpsertCashReconciliationInput = {
  legalEntityCode: DocumentEntityCode
  periodKey: string
  branchId: string
  glAccountId?: string
  glAccountCode?: string
  actualCountedCash: string | number
  note?: string | null
  evidenceNote?: string | null
  actorStaffId: string
}

export type UpdateCashReconciliationDraftInput = {
  id: string
  legalEntityCode: DocumentEntityCode
  actualCountedCash?: string | number
  note?: string | null
  evidenceNote?: string | null
  actorStaffId: string
}

export type CashReconciliationWorkflowInput = {
  id: string
  legalEntityCode: DocumentEntityCode
  actorStaffId: string
}
