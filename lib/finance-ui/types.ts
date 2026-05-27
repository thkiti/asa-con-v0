export type FinanceFilterValues = {
  branchId?: string
  from?: string
  to?: string
}

export type ReconciliationVariance = {
  domain: string
  label: string
  operationalAmount: string
  glAmount: string
  variance: string
  varianceType?: string
  varianceReason?: string
}

export type InventoryReconciliationResult = {
  filter: FinanceFilterValues
  operationalTotalValue: string
  glInventoryBalance: string
  variances: ReconciliationVariance[]
}

export type SalesReconciliationResult = {
  filter: FinanceFilterValues
  operationalRevenue: string
  glRevenueBalance: string
  paymentBreakdown: ReconciliationVariance[]
  variances: ReconciliationVariance[]
}

export type AccountingPeriodStatus = "OPEN" | "SOFT_CLOSED" | "HARD_CLOSED"

export type AccountingPeriodRow = {
  id: string
  periodKey: string
  branchId: string
  branchName: string
  status: AccountingPeriodStatus
  openedAt: string
  closedAt: string | null
}

export type PeriodListResult = {
  periods: AccountingPeriodRow[]
}

export type SessionDisplay = {
  name: string
  role: string
}

export type PeriodAction = "SOFT_CLOSE" | "HARD_CLOSE" | "REOPEN"

export type AccountingPeriodMutationResult = {
  period: AccountingPeriodRow
}

export type { ReconciliationIssuesFilter } from "./reconciliation-issues"
export type {
  ReconciliationIssueJournalRef,
  ReconciliationIssueRow,
  ReconciliationIssuesResult,
  ReconciliationIssueVoucherRef,
} from "./reconciliation-issues"
