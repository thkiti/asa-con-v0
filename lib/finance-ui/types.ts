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

export type RefundReconciliationResult = {
  filter: FinanceFilterValues
  operationalRefundTotal: string
  glRefundRevenueTotal: string
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
export type {
  ReconciliationSnapshotDetail,
  ReconciliationSnapshotHeader,
  ReconciliationSnapshotPayloadV1,
} from "@/lib/finance/reconciliation-snapshot-types"

export type VoucherLineDetail = {
  id: string
  lineNo: number
  accountCode: string
  accountName: string
  debit: string
  credit: string
  memo: string | null
}

export type VoucherJournalDetail = {
  id: string
  postedAt: string
  lines: VoucherLineDetail[]
}

export type VoucherDetail = {
  id: string
  voucherNo: string
  date: string
  status: string
  branchId: string
  refType: string
  refId: string
  refNo: string | null
  description: string | null
  postedAt: string | null
  lines: VoucherLineDetail[]
  journal: VoucherJournalDetail | null
}

export type VoucherDetailResult = {
  voucher: VoucherDetail
}

export type ManualJournalLineInput = {
  accountCode: string
  debit: string | number
  credit: string | number
  memo?: string | null
}

export type PostedVoucherResult = {
  voucherId: string
  voucherNo: string
  journalEntryId: string
  alreadyPosted: boolean
}

export type JournalListRow = {
  id: string
  voucherId: string
  voucherNo: string
  refType: string
  date: string
  branchId: string
  periodId: string
  description: string | null
  totalDebit: string
  totalCredit: string
  reversalOfJournalEntryId: string | null
  isReversal: boolean
  isReversed: boolean
  reversedByJournalId: string | null
  reversedByVoucherNo: string | null
}

export type JournalListResult = {
  journals: JournalListRow[]
  total: number
}

export type JournalInquiryLine = {
  id: string
  lineNo: number
  accountCode: string
  accountName: string
  debit: string
  credit: string
  memo: string | null
}

export type GeneralLedgerTransaction = {
  journalEntryId: string
  journalLineId: string
  journalDate: string
  entryNo: string
  sourceRef: string | null
  description: string | null
  lineMemo: string | null
  debit: string
  credit: string
  signedMovement: string
  runningBalance: string
}

export type GeneralLedgerAccount = {
  accountCode: string
  accountName: string
  accountType: string
  openingDebit: string
  openingCredit: string
  openingBalance: string
  transactions: GeneralLedgerTransaction[]
  closingBalance: string
}

export type GeneralLedgerResult = {
  filter: {
    branchId: string
    periodKey?: string
    from?: string
    to?: string
    accountId?: string
    accountIds?: string[]
    accountCode?: string
    accountCodes?: string[]
  }
  accounts: GeneralLedgerAccount[]
}

export type ProfitLossRow = {
  accountCode: string
  accountName: string
  amount: string
}

export type ProfitLossResult = {
  filter: {
    branchId: string
    periodKey?: string
    from?: string
    to?: string
  }
  revenue: ProfitLossRow[]
  expenses: ProfitLossRow[]
  totalRevenue: string
  totalExpense: string
  netIncome: string
}

export type TrialBalanceRow = {
  accountCode: string
  accountName: string
  accountType: string
  totalDebit: string
  totalCredit: string
  signedBalance: string
}

export type TrialBalanceResult = {
  filter: {
    branchId: string
    periodKey?: string
    from?: string
    to?: string
    hideZeroBalances?: boolean
  }
  rows: TrialBalanceRow[]
  totalDebits: string
  totalCredits: string
  difference: string
  isBalanced: boolean
}

export type BalanceSheetRow = {
  accountCode: string
  accountName: string
  amount: string
}

export type BalanceSheetResult = {
  filter: {
    branchId: string
    periodKey?: string
    from?: string
    to?: string
    hideZeroBalances?: boolean
  }
  period: {
    branchId: string
    periodKey?: string
    periodId?: string
    periodStatus?: string
    from?: string
    to?: string
  }
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

export type RetainedEarningsWarning = {
  code: string
  message: string
}

export type RetainedEarningsResult = {
  filter: {
    branchId: string
    periodKey?: string
    from?: string
    to?: string
  }
  period: {
    branchId: string
    periodKey?: string
    periodId?: string
    periodStatus?: string
    from?: string
    to?: string
  }
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

export type ChangesInEquityColumn = {
  accountCode: string
  accountName: string
}

export type ChangesInEquityRowKey =
  | "OPENING"
  | "PROFIT_FOR_PERIOD"
  | "OTHER_CHANGES"
  | "CLOSING"
  | "RECONCILIATION_CHECK"

export type ChangesInEquityRow = {
  rowKey: ChangesInEquityRowKey
  label: string
  amounts: Record<string, string>
  total: string
}

export type ChangesInEquityWarning = {
  code: string
  message: string
}

export type ChangesInEquityResult = {
  filter: {
    branchId: string
    periodKey?: string
    from?: string
    to?: string
  }
  period: {
    branchId: string
    periodKey?: string
    periodId?: string
    periodStatus?: string
    from?: string
    to?: string
  }
  columns: ChangesInEquityColumn[]
  rows: ChangesInEquityRow[]
  profitForPeriod: string
  profitSource: "CLOSING_ENTRY" | "PROFIT_LOSS"
  retainedEarningsAccountCode: string
  activeClosingEntry: {
    voucherId: string
    voucherNo: string
    journalEntryId: string
    netIncome: string
    postedAt: string
  } | null
  reconciliation: {
    isBalanced: boolean
    columnDifferences: Record<string, string>
    totalDifference: string
  }
  warnings: ChangesInEquityWarning[]
}

export type CashFlowLine = {
  key: string
  label: string
  amount: string
  source: string
  accountCode?: string
}

export type CashFlowSection = {
  lines: CashFlowLine[]
  subtotal: string
}

export type CashFlowWarning = {
  code: string
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
  filter: {
    branchId: string
    periodKey?: string
    from?: string
    to?: string
  }
  period: {
    branchId: string
    periodKey?: string
    periodId?: string
    periodStatus?: string
    from?: string
    to?: string
  }
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

export type JournalInquiryResult = {
  id: string
  voucherId: string
  voucherNo: string
  refType: string
  refId: string
  refNo: string | null
  description: string | null
  date: string
  branchId: string
  periodId: string
  postedAt: string
  reversalOfJournalEntryId: string | null
  isReversal: boolean
  isReversed: boolean
  reverses: {
    id: string
    voucherNo: string
  } | null
  reversedBy: {
    id: string
    voucherNo: string
  } | null
  lines: JournalInquiryLine[]
}
