import type { DocType, PaymentMethod, ProductType } from "@/generated/prisma/client"

export type ValuationMethod = "AVG_COST" | "FIFO"

export type StockSummaryFilter = {
  branchId?: string
  productId?: string
  /** When false (default), only TRACKED products are included. */
  includeNonTracked?: boolean
  /** When false (default), rows with qty === 0 are excluded. */
  includeZeroQty?: boolean
}

export type StockSummaryRow = {
  branchId: string
  branchName: string
  productId: string
  productCode: string
  productName: string
  productType: ProductType
  qty: number
  avgCost: string
  totalValue: string
}

export type StockSummaryTotals = {
  qty: number
  totalValue: string
}

export type StockSummaryResult = {
  valuationMethod: "AVG_COST"
  rows: StockSummaryRow[]
  totals: StockSummaryTotals
}

export type FifoValuationFilter = {
  branchId?: string
  productId?: string
}

export type FifoValuationRow = {
  branchId: string
  productId: string
  fifoQty: number
  fifoValue: string
}

export type FifoValuationTotals = {
  fifoQty: number
  fifoValue: string
}

export type FifoValuationResult = {
  valuationMethod: "FIFO"
  rows: FifoValuationRow[]
  totals: FifoValuationTotals
}

export type MovementReportFilter = {
  branchId?: string
  productId?: string
  from?: Date | string
  to?: Date | string
  refType?: string
  docType?: DocType
}

export type MovementReportRow = {
  id: string
  branchId: string
  productId: string
  date: Date
  qtyIn: number
  qtyOut: number
  unitCost: string
  refType: string
  refId: string
  refLineId: string
  documentId: string | null
  docType: DocType | null
}

export type MovementReportTotals = {
  qtyIn: number
  qtyOut: number
}

export type MovementReportResult = {
  rows: MovementReportRow[]
  totals: MovementReportTotals
}

export type SalesSummaryFilter = {
  branchId?: string
  from?: Date | string
  to?: Date | string
}

export type PaymentBreakdownEntry = {
  method: PaymentMethod
  amount: string
  saleCount: number
}

export type CashierSummaryEntry = {
  staffId: string | null
  saleCount: number
  revenue: string
}

export type ProductTypeBreakdownEntry = {
  productType: ProductType
  lineCount: number
  qty: number
  revenue: string
}

export type SalesSummaryResult = {
  saleCount: number
  revenue: string
  paymentBreakdown: PaymentBreakdownEntry[]
  cashierSummary: CashierSummaryEntry[]
  productTypeBreakdown: ProductTypeBreakdownEntry[]
}

export type DailyBranchSummaryFilter = {
  branchId: string
  day: Date | string
}

export type DailyBranchSummaryStockSlice = {
  valuationMethod: StockSummaryResult["valuationMethod"]
  totals: StockSummaryTotals
}

export type DailyBranchSummarySalesSlice = {
  saleCount: number
  revenue: string
}

export type DailyBranchSummary = {
  branchId: string
  day: string
  stock: DailyBranchSummaryStockSlice
  sales: DailyBranchSummarySalesSlice
}
