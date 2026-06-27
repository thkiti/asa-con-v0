export type ReceiptLookupArchiveStatus = "ready" | "pending" | "failed" | "legacy"

export type ReceiptLookupLineItem = {
  code: string
  name: string
  qty: number
  unitPrice: string
  lineTotal: string
}

export type ReceiptLookupRow = {
  receiptId: string
  saleId: string
  receiptNo: string
  issuedAt: string
  branchCode: string
  branchName: string
  branchAddress: string | null
  branchPhone: string | null
  companyTaxId: string | null
  machineTaxId: string | null
  staffDisplay: string | null
  total: string
  paymentMethod: string
  paymentMethodLabel: string
  cashAmount: string
  change: string
  archiveStatus: ReceiptLookupArchiveStatus
  archiveStatusLabel: string
  archiveError?: string
  pdfUrl: string | null
  items: ReceiptLookupLineItem[]
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
