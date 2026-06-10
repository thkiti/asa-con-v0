export type ProfitLossFilter = {
  branchId: string
  periodKey?: string
  from?: string
  to?: string
}

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
