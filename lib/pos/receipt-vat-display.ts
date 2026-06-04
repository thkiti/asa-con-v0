import { formatReceiptMoney } from "./receipt-money"

/** Display-only VAT from VAT-inclusive total (does not change sale total). */
export function calculateReceiptVat7FromInclusive(total: string | number): string {
  const n = Number(total)
  if (!Number.isFinite(n) || n <= 0) return "0.00"
  const taxable = n / 1.07
  const vat = n - taxable
  return formatReceiptMoney(vat)
}
