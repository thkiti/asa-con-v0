import type { ResolvedThermalLayout } from "@/lib/thermal/types"

export const RECEIPT_PDF_SNAPSHOT_VERSION = 1 as const

export type ReceiptPdfSnapshotLine = {
  code: string
  name: string
  qty: number
  unitPrice: string
  lineTotal: string
}

/** Frozen checkout-time payload — sole input for receipt PDF render and storage. */
export type ReceiptPdfSnapshot = {
  snapshotVersion: typeof RECEIPT_PDF_SNAPSHOT_VERSION
  receiptId: string
  saleId: string
  branchId: string
  receiptNo: string
  issuedAt: string
  branchCode: string
  branchName: string
  branchAddress: string | null
  branchPhone: string | null
  companyDisplayName: string | null
  companyTaxId: string | null
  machineTaxId: string | null
  cashierDisplay: string | null
  lines: ReceiptPdfSnapshotLine[]
  total: string
  paymentMethod: string
  cashAmount: string
  change: string
  thermalLayout: ResolvedThermalLayout
}
