import type { PaymentMethod } from "@/generated/prisma/client"

export const READ_REPORT_PAYMENT_ORDER = [
  "CASH",
  "CREDIT_CARD",
  "PROMPT_PAY",
  "QR_CODE",
  "TRANSFER",
] as const

export type ReadReportPaymentKey = (typeof READ_REPORT_PAYMENT_ORDER)[number]

export const READ_REPORT_PAYMENT_LABEL: Record<ReadReportPaymentKey, string> = {
  CASH: "CASH",
  CREDIT_CARD: "CREDIT CARD",
  PROMPT_PAY: "PROMPT PAY",
  QR_CODE: "QR CODE",
  TRANSFER: "TRANSFER",
}

/** แบ่งยอดตาม Payment.method ใน v0 */
export function readReportPaymentBucket(method: PaymentMethod): ReadReportPaymentKey {
  if (method === "CASH") return "CASH"
  if (method === "CARD") return "CREDIT_CARD"
  if (method === "TRANSFER") return "TRANSFER"
  if (method === "QR") return "QR_CODE"
  return "QR_CODE"
}
