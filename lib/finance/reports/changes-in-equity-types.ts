import type { BalanceSheetPeriodMeta } from "./balance-sheet-types"

import type { FinanceReportScope } from "./report-filter"

export type ChangesInEquityFilter = FinanceReportScope

export type ChangesInEquityRowKey =
  | "OPENING"
  | "PROFIT_FOR_PERIOD"
  | "OTHER_CHANGES"
  | "CLOSING"
  | "RECONCILIATION_CHECK"

export type ChangesInEquityColumn = {
  accountCode: string
  accountName: string
}

export type ChangesInEquityRow = {
  rowKey: ChangesInEquityRowKey
  label: string
  amounts: Record<string, string>
  total: string
}

export type ChangesInEquityProfitSource = "CLOSING_ENTRY" | "PROFIT_LOSS"

export type ChangesInEquityClosingEntrySummary = {
  voucherId: string
  voucherNo: string
  journalEntryId: string
  netIncome: string
  postedAt: string
}

export type ChangesInEquityWarningCode =
  | "NO_RETAINED_EARNINGS_ACCOUNT"
  | "PROFIT_CLOSING_ENTRY_MISMATCH"
  | "RECONCILIATION_DIFFERENCE"
  | "UNCLOSED_PROFIT_PERIOD"

export type ChangesInEquityWarning = {
  code: ChangesInEquityWarningCode
  message: string
}

export type ChangesInEquityResult = {
  filter: ChangesInEquityFilter
  period: BalanceSheetPeriodMeta
  columns: ChangesInEquityColumn[]
  rows: ChangesInEquityRow[]
  profitForPeriod: string
  profitSource: ChangesInEquityProfitSource
  retainedEarningsAccountCode: string
  activeClosingEntry: ChangesInEquityClosingEntrySummary | null
  reconciliation: {
    isBalanced: boolean
    columnDifferences: Record<string, string>
    totalDifference: string
  }
  warnings: ChangesInEquityWarning[]
}
