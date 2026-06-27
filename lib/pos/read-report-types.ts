import type { ReadReportGroupLine, ReadReportPaymentLine, ReadReportCollectDailyCashLine } from "@/lib/pos/aggregatePosReadReport"

export type ReadReportMode = "X" | "Z" | "COLLECT"

export type ReadReportPayload = {
  mode: ReadReportMode
  /** COL-{BranchCode}-{YYYYMM}-{Seq4} when persisted from POS collect. */
  collectNo?: string
  bangkokDate: string
  bangkokDateFrom?: string
  bangkokDateTo?: string
  generatedAt: string
  staffId: string
  staffName: string
  branchCode: string
  branchName: string
  groupLines: ReadReportGroupLine[]
  paymentLines: ReadReportPaymentLine[]
  /** COLLECT — one row per Bangkok sales date, CASH sales only. */
  dailyCashLines?: ReadReportCollectDailyCashLine[]
  grandTotal: number
  saleCount: number
  /** Same-day refunds for Z/X daily report (read-only). */
  refundCount: number
  refundTotal: number
  /** grandTotal − refundTotal */
  netTotal: number
  /** READ Z — daily (single day) or cumulative month-to-date through readZViewDate. */
  readZScope?: "daily" | "cumulative-to-date"
  /** Bangkok YYYY-MM-DD anchor for the viewed READ Z slip. */
  readZViewDate?: string
  /** HO READ Z Lookup review payload (distinct from Today credential report). */
  readZReview?: boolean
  monthlySubtotals?: Array<{
    month: string
    grandTotal: number
    saleCount: number
  }> | null
}
