/** Client-safe payment method values — mirrors Prisma PaymentMethod enum without importing generated client. */
export const POS_CHECKOUT_PAYMENT_METHODS = [
  "CASH",
  "CARD",
  "BANK_TRANSFER",
] as const

export type PosCheckoutPaymentMethod = (typeof POS_CHECKOUT_PAYMENT_METHODS)[number]

export const POS_CHECKOUT_PAYMENT_DEFAULT: PosCheckoutPaymentMethod = "CASH"

export type PosCheckoutPaymentOption = {
  value: PosCheckoutPaymentMethod
  label: string
  confirmLabel: string
  receiptLabel: string
}

export const POS_CHECKOUT_PAYMENT_OPTIONS: readonly PosCheckoutPaymentOption[] = [
  {
    value: "CASH",
    label: "Cash",
    confirmLabel: "Pay CASH",
    receiptLabel: "CASH",
  },
  {
    value: "CARD",
    label: "Card",
    confirmLabel: "Pay CARD",
    receiptLabel: "CARD",
  },
  {
    value: "BANK_TRANSFER",
    label: "Bank Transfer",
    confirmLabel: "Pay BANK TRANSFER",
    receiptLabel: "BANK TRANSFER",
  },
]

/** Legacy POS payment methods still stored on historical sales. */
const LEGACY_PAYMENT_RECEIPT_LABELS: Record<string, string> = {
  OTHER: "PROMPT PAY",
  QR: "QR CODE",
  TRANSFER: "TRANSFER",
}

export const POS_BANK_TRANSFER_UPLOAD_LATER_LABEL = "Print Receipt - Upload Later"

export function posCheckoutConfirmLabel(method: PosCheckoutPaymentMethod): string {
  return (
    POS_CHECKOUT_PAYMENT_OPTIONS.find((o) => o.value === method)?.confirmLabel ??
    `Pay ${method}`
  )
}

export function posCheckoutReceiptLabel(method: PosCheckoutPaymentMethod): string {
  return (
    POS_CHECKOUT_PAYMENT_OPTIONS.find((o) => o.value === method)?.receiptLabel ??
    method
  )
}

export function posReceiptSlipPaymentLabel(method: string): string {
  if (isPosCheckoutPaymentMethod(method)) {
    return posCheckoutReceiptLabel(method)
  }
  return LEGACY_PAYMENT_RECEIPT_LABELS[method] ?? method
}

export function isPosCheckoutPaymentMethod(value: string): value is PosCheckoutPaymentMethod {
  return (POS_CHECKOUT_PAYMENT_METHODS as readonly string[]).includes(value)
}
