import type { SalesTargetBranchOption } from "@/lib/shop/sales-target-types"

export type SalesDashboardScope = "company" | "branch"

export type SalesDashboardMonthSummary = {
  grossSales: string
  refunds: string
  netSales: string
}

export type SalesDashboardDayCell = {
  dateKey: string
  target: string | null
  actualGross: string
}

export type SalesDashboardView = {
  scope: SalesDashboardScope
  year: number
  month: number
  branches: SalesTargetBranchOption[]
  monthSummary: SalesDashboardMonthSummary
  days: SalesDashboardDayCell[]
  hasAnyTarget: boolean
}

export type SalesDashboardBranchDayRow = {
  branchId: string
  code: string
  name: string
  grossSales: string
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
