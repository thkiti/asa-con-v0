import type { AccountingPeriodStatus } from "@/generated/prisma/client"

export type ReconciliationDateFilter = {
  branchId?: string
  from?: Date | string
  to?: Date | string
}

export type InventoryReconciliationFilter = ReconciliationDateFilter

export type SalesReconciliationFilter = ReconciliationDateFilter

export type RefundReconciliationFilter = ReconciliationDateFilter

export type RefundReconciliationResult = {
  filter: RefundReconciliationFilter
  operationalRefundTotal: string
  glRefundRevenueTotal: string
  paymentBreakdown: ReconciliationVariance[]
  variances: ReconciliationVariance[]
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
  filter: InventoryReconciliationFilter
  operationalTotalValue: string
  glInventoryBalance: string
  variances: ReconciliationVariance[]
}

export type SalesReconciliationResult = {
  filter: SalesReconciliationFilter
  /** Gross POS sales in scope (VAT-inclusive). */
  operationalGrossSales: string
  /** Gross POS refunds in scope (VAT-inclusive). */
  operationalGrossRefunds: string
  /** operationalGrossSales − operationalGrossRefunds. */
  operationalNetGross: string
  /** Net credit balance on POS sales revenue GL (DEFAULT_ACCOUNT_CODES.REVENUE) for the period. */
  glNetRevenue: string
  /** Net credit balance on output VAT account(s) for the period. */
  glOutputVat: string
  /** glNetRevenue + glOutputVat — comparable to operationalNetGross. */
  glGrossEquivalent: string
  /** operationalNetGross − glGrossEquivalent. */
  salesVariance: string
  /** Gross tender inflows from sales payments. */
  operationalTenderIn: string
  /** Gross tender outflows from refunds. */
  operationalTenderRefundOut: string
  /** operationalTenderIn − operationalTenderRefundOut. */
  operationalTenderNet: string
  /** Net debit balance across Stage 1 clearing accounts (1100/1110/1120/1190). */
  glTenderClearingNet: string
  /** operationalTenderNet − glTenderClearingNet. */
  tenderVariance: string
  /** Legacy alias for operationalNetGross (close evidence / snapshots). */
  operationalRevenue: string
  /** Legacy alias for glGrossEquivalent (close evidence / snapshots). */
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

export type ReconciliationIssueType =
  | "MISSING_VOUCHER"
  | "DUPLICATE_VOUCHER"
  | "TOTAL_MISMATCH"
  | "MISSING_COGS_LINES"
  | "INVENTORY_VALUE_MISMATCH"
  | "MISSING_REFUND"

export type ReconciliationIssue = {
  id: string
  sourceType: "SALE" | "STOCK_DOCUMENT" | "REFUND"
  sourceId: string
  issueType: ReconciliationIssueType
  severity: "ERROR" | "WARNING"
  message: string
  expectedAmount?: number
  actualAmount?: number
  difference?: number
}

export type ReconciliationSummary = {
  checkedSales: number
  checkedStockDocuments: number
  checkedRefunds: number
  issueCount: number
  issues: ReconciliationIssue[]
}

export type FinanceReconciliationInput = {
  fromDate?: Date
  toDate?: Date
  branchId?: string
}
