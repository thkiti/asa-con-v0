export type PendingPaymentEvidenceRow = {
  evidenceId: string
  saleId: string
  receiptNo: string
  issuedAt: string
  total: string
  staff: string | null
}

export type PendingPaymentEvidenceResult = {
  count: number
  receipts: PendingPaymentEvidenceRow[]
}
