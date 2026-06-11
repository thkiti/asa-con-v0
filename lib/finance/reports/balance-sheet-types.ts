import type { AccountingPeriodStatus } from "@/generated/prisma/client"

export type BalanceSheetFilter = {
  branchId: string
  periodKey?: string
  from?: string
  to?: string
  hideZeroBalances?: boolean
}

export type BalanceSheetRow = {
  accountCode: string
  accountName: string
  amount: string
}

export type BalanceSheetPeriodMeta = {
  branchId: string
  periodKey?: string
  periodId?: string
  periodStatus?: AccountingPeriodStatus
  from?: string
  to?: string
}

export type BalanceSheetResult = {
  filter: BalanceSheetFilter
  period: BalanceSheetPeriodMeta
  assets: BalanceSheetRow[]
  liabilities: BalanceSheetRow[]
  equity: BalanceSheetRow[]
  totalAssets: string
  totalLiabilities: string
  totalEquity: string
  totalLiabilitiesAndEquity: string
  balanceDifference: string
  isBalanced: boolean
}
