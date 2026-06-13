import type { BalanceSheetPeriodMeta } from "./balance-sheet-types"

export type CashFlowFilter = {
  branchId: string
  periodKey?: string
  from?: string
  to?: string
}

export type CashFlowLineSource =
  | "PROFIT_LOSS"
  | "GL_DELTA"
  | "EQUITY_OTHER"
  | "CONFIG"
  | "NONE"

export type CashFlowLine = {
  key: string
  label: string
  amount: string
  source: CashFlowLineSource
  accountCode?: string
}

export type CashFlowSection = {
  lines: CashFlowLine[]
  subtotal: string
}

export type CashFlowWarningCode =
  | "PENDING_MAPPING"
  | "UNMAPPED_ACCOUNT_WITH_ACTIVITY"
  | "CASH_RECONCILIATION_DIFFERENCE"
  | "UNCLOSED_PROFIT_PERIOD"
  | "NO_INVESTING_MAPPED"

export type CashFlowWarning = {
  code: CashFlowWarningCode
  message: string
}

export type CashFlowReconciliation = {
  openingCashAndEquivalents: string
  closingCashAndEquivalents: string
  glChange: string
  computedChange: string
  difference: string
  isReconciled: boolean
}

export type CashFlowResult = {
  filter: CashFlowFilter
  period: BalanceSheetPeriodMeta
  method: "INDIRECT"
  sections: {
    operating: CashFlowSection
    investing: CashFlowSection
    financing: CashFlowSection
  }
  netChangeInCash: string
  netIncome: string
  cashReconciliation: CashFlowReconciliation
  warnings: CashFlowWarning[]
}
