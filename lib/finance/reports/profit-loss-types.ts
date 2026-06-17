import type { BranchScopedReportFilter } from "./report-filter"

export type ProfitLossFilter = BranchScopedReportFilter

export type ProfitLossRow = {
  accountCode: string
  accountName: string
  amount: string
}

export type ProfitLossResult = {
  filter: ProfitLossFilter
  revenue: ProfitLossRow[]
  expenses: ProfitLossRow[]
  totalRevenue: string
  totalExpense: string
  netIncome: string
}
