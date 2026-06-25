import type { PaymentMethod } from "@/generated/prisma/client"

/** READ X/Z payment summary display order — display grouping only. */
export const READ_REPORT_PAYMENT_ORDER = [
  "CASH",
  "CREDIT_CARD",
  "BANK_TRANSFER",
] as const

export type ReadReportPaymentKey = (typeof READ_REPORT_PAYMENT_ORDER)[number]

export const READ_REPORT_PAYMENT_LABEL: Record<ReadReportPaymentKey, string> = {
  CASH: "CASH",
  CREDIT_CARD: "CREDIT CARD",
  BANK_TRANSFER: "BANK TRANSFER",
}

/**
 * Map stored Payment.method to READ X/Z display bucket.
 * Bank-style methods (BANK_TRANSFER, TRANSFER, QR, OTHER) consolidate to BANK TRANSFER.
 */
export function readReportPaymentBucket(method: PaymentMethod): ReadReportPaymentKey {
  if (method === "CASH") return "CASH"
  if (method === "CARD") return "CREDIT_CARD"
  return "BANK_TRANSFER"
}
