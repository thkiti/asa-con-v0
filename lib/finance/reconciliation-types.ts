import type { AccountingPeriodStatus } from "@/generated/prisma/client"

export type ReconciliationDateFilter = {
  branchId?: string
  from?: Date | string
  to?: Date | string
}

export type InventoryReconciliationFilter = ReconciliationDateFilter

export type SalesReconciliationFilter = ReconciliationDateFilter

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
  filter: InventoryReconciliationFilter
  operationalTotalValue: string
  glInventoryBalance: string
  variances: ReconciliationVariance[]
}

export type SalesReconciliationResult = {
  filter: SalesReconciliationFilter
  operationalRevenue: string
  glRevenueBalance: string
  paymentBreakdown: ReconciliationVariance[]
  variances: ReconciliationVariance[]
}

export type GlAccountBalanceFilter = {
  accountCodes: string[]
  branchId?: string
  from?: Date | string
  to?: Date | string
}

export type GlAccountBalanceRow = {
  accountCode: string
  accountName: string
  accountType: string
  debitTotal: string
  creditTotal: string
  balance: string
}

export type GlAccountBalanceResult = {
  filter: GlAccountBalanceFilter
  accounts: GlAccountBalanceRow[]
  totals: {
    debitTotal: string
    creditTotal: string
  }
}

export type ClosePolicyContext = {
  role: import("./close-policy").ClosePolicyRole
  overrideReason?: string | null
}

export type PeriodPostingContext = ClosePolicyContext & {
  periodKey?: string
}

export type PeriodStatusLabel = {
  status: AccountingPeriodStatus
  label: string
  description: string
}
