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
