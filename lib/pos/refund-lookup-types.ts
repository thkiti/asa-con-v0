import type { RefundKind } from "@/generated/prisma/client"

export type RefundLookupArchiveStatus = "ready" | "pending" | "failed" | "legacy"

export type RefundLookupRow = {
  refundId: string
  refundNo: string
  issuedAt: string
  kind: RefundKind
  amount: string
  reason: string | null
  branchId: string
  branchCode: string
  branchName: string
  branchAddress: string | null
  branchPhone: string | null
  companyTaxId: string | null
  machineTaxId: string | null
  cashierDisplay: string | null
  saleId: string | null
  originalReceiptId: string | null
  originalReceiptNo: string | null
  originalReceiptTotal: string | null
  archiveStatus: RefundLookupArchiveStatus
  archiveStatusLabel: string
  archiveError?: string
  pdfUrl: string | null
}

export type RefundLookupResult = {
  refunds: RefundLookupRow[]
}

export type SearchRefundLookupInput = {
  branchId: string
  refundNo?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  limit?: number
}
