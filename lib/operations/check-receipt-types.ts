export type CheckReceiptRow = {
  saleId: string
  receiptNo: string
  issuedAt: string
  staff: string | null
  total: string
  paymentMethod: string
  slipImageUrl: string | null
}

export type CheckReceiptResult = {
  branchId: string
  branchCode: string
  year: number
  month: number
  receipts: CheckReceiptRow[]
}
