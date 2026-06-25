export type ReceiptLookupArchiveStatus = "ready" | "pending" | "failed" | "legacy"

export type ReceiptLookupRow = {
  receiptId: string
  receiptNo: string
  issuedAt: string
  branchCode: string
  branchName: string
  staffDisplay: string | null
  total: string
  paymentMethodLabel: string
  archiveStatus: ReceiptLookupArchiveStatus
  archiveStatusLabel: string
  archiveError?: string
  pdfUrl: string | null
}

export type ReceiptLookupResult = {
  receipts: ReceiptLookupRow[]
}

export type SearchReceiptLookupInput = {
  branchId: string
  receiptNo?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  limit?: number
}
