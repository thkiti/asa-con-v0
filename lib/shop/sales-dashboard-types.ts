import type { SalesTargetBranchOption } from "@/lib/shop/sales-target-types"

export type SalesDashboardScope = "company" | "branch"

export type SalesDashboardMonthSummary = {
  /** Sum of prior-month gross on each comparable calendar-grid day in the view month. */
  lastMonthSales: string
  grossSales: string
  /** Sum of snapshotted sale.vatAmount for completed Actual sales. */
  actualVat: string
  /** grossSales - actualVat (VAT-exclusive; not the same as netSales). */
  actualNet: string
  refunds: string
  /** grossSales - refunds (refund-adjusted gross — not VAT-exclusive). */
  netSales: string
  billCount: number
}

export type SalesDashboardDayCell = {
  dateKey: string
  target: string | null
  actualGross: string
  /** Sum of snapshotted sale.vatAmount for the day. */
  actualVat: string
  /** actualGross - actualVat for reconciliation (may be unused in UI). */
  actualNet: string
  /** Previous-month sales on the comparable calendar grid date, or null for "-". */
  lastMonthGross: string | null
}

export type SalesDashboardView = {
  scope: SalesDashboardScope
  year: number
  month: number
  /** When true, summary row shows year-to-date totals; calendar stays on selected month. */
  yearToDate?: boolean
  branches: SalesTargetBranchOption[]
  monthSummary: SalesDashboardMonthSummary
  /** Previous-month weekday multipliers (Sun=0 … Sat=6), null renders "-". */
  previousMonthWeekdayPatterns: ReadonlyArray<string | null>
  days: SalesDashboardDayCell[]
  hasAnyTarget: boolean
}

export type SalesDashboardBranchDayRow = {
  branchId: string
  code: string
  name: string
  grossSales: string
  /** Sum of snapshotted sale.vatAmount for the branch on that day. */
  actualVat: string
  /** grossSales - actualVat */
  actualNet: string
  receiptCount: number
}

export type SalesDashboardReceiptRow = {
  saleId: string
  receiptNo: string
  time: string
  total: string
  /** null for CASH/CARD; PENDING | UPLOADED | MISSING for BANK_TRANSFER */
  evidenceStatus: "PENDING" | "UPLOADED" | "MISSING" | null
}

export type SalesDashboardLinkedRefund = {
  refundId: string
  refundNo: string
  amount: string
  createdAt: string
  printUrl: string
}

export type SalesDashboardReceiptPreview = {
  saleId: string
  branchId: string
  receiptNo: string
  time: string
  saleTotal: string
  refundedTotal: string
  remainingRefundable: string
  items: { name: string; qty: number; lineTotal: string }[]
  linkedRefunds: SalesDashboardLinkedRefund[]
  salePrintUrl: string
  /** null for CASH/CARD; PENDING | UPLOADED | MISSING for BANK_TRANSFER */
  evidenceStatus: "PENDING" | "UPLOADED" | "MISSING" | null
}

export type SalesDashboardDayDetail =
  | { mode: "branch-summary"; dateKey: string; branches: SalesDashboardBranchDayRow[] }
  | {
      mode: "receipt-list"
      dateKey: string
      branchId: string
      branchCode: string
      receipts: SalesDashboardReceiptRow[]
    }
  | { mode: "receipt-preview"; preview: SalesDashboardReceiptPreview }
