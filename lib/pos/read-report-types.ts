import type { ReadReportGroupLine, ReadReportPaymentLine } from "@/lib/pos/aggregatePosReadReport"

export type ReadReportMode = "X" | "Z" | "COLLECT"

export type ReadReportPayload = {
  mode: ReadReportMode
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
  grandTotal: number
  saleCount: number
  monthlySubtotals?: Array<{
    month: string
    grandTotal: number
    saleCount: number
  }> | null
}
