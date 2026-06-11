import type { BalanceSheetPeriodMeta, BalanceSheetRow } from "./balance-sheet-types"

export type RetainedEarningsFilter = {
  branchId: string
  periodKey?: string
  from?: string
  to?: string
}

export type RetainedEarningsWarningCode =
  | "NO_RETAINED_EARNINGS_ACCOUNT"
  | "OTHER_EQUITY_PRESENT"
  | "UNEXPLAINED_BALANCE_SHEET_GAP"
  | "NEGATIVE_RETAINED_EARNINGS"
  | "LOSS_PERIOD"

export type RetainedEarningsWarning = {
  code: RetainedEarningsWarningCode
  message: string
}

export type RetainedEarningsResult = {
  filter: RetainedEarningsFilter
  period: BalanceSheetPeriodMeta
  retainedEarningsAccounts: BalanceSheetRow[]
  otherEquityAccounts: BalanceSheetRow[]
  postedRetainedEarnings: string
  otherEquityTotal: string
  postedTotalEquity: string
  currentNetIncome: string
  adjustedRetainedEarnings: string
  adjustedTotalEquity: string
  totalAssets: string
  totalLiabilities: string
  balanceSheetDifference: string
  unclosedEarningsGap: string
  isUnclosedEarningsExplained: boolean
  isEconomicallyBalanced: boolean
  warnings: RetainedEarningsWarning[]
}
