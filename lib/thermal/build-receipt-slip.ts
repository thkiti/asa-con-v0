import { formatReceiptMoney } from "@/lib/pos/receipt-money"
import { calculateReceiptVat7FromInclusive } from "@/lib/pos/receipt-vat-display"
import type { ReceiptPrintContext } from "@/lib/pos/receipt-print-context"
import { posReceiptSlipPaymentLabel } from "@/lib/pos-ui/pos-payment-methods"
import type { ResolvedThermalLayout } from "./types"
import {
  THERMAL_COLUMNS,
  appendThermalCenteredIfPresent,
  appendThermalFooterLines,
  appendThermalHeaderLines,
  centerThermalLine,
  formatThermalAmountLine,
  formatThermalCompactUnitPrice,
  formatThermalDateTime,
  padThermalLine,
  repeatThermalChar,
  truncateThermalText,
} from "./format"

function computeReceiptMaxAmountWidth(receipt: ReceiptPrintContext): number {
  const amounts: string[] = []
  for (const item of receipt.lines) {
    amounts.push(formatReceiptMoney(item.lineTotal))
  }
  amounts.push(
    formatReceiptMoney(receipt.total),
    calculateReceiptVat7FromInclusive(receipt.total),
    formatReceiptMoney(receipt.cashAmount),
    formatReceiptMoney(receipt.change)
  )
  return Math.max(4, ...amounts.map((a) => a.length))
}

function formatReceiptItemDetailLine(
  item: { code: string; qty: number; unitPrice: string; lineTotal: string },
  width: number,
  amountWidth: number
): string {
  const code = item.code.trim() || "-"
  const left = `${code}=${item.qty}x${formatThermalCompactUnitPrice(item.unitPrice)}`
  return formatThermalAmountLine(left, formatReceiptMoney(item.lineTotal), width, amountWidth)
}

function appendReceiptNo(lines: string[], receiptNo: string, width: number): void {
  if (receiptNo.length <= width - 8) {
    lines.push(padThermalLine("Receipt", receiptNo, width))
    return
  }
  lines.push("Receipt")
  const no = receiptNo.length > width ? receiptNo.slice(0, width) : receiptNo
  lines.push(no)
}

export function buildReceiptSlipText(
  receipt: ReceiptPrintContext,
  layout: ResolvedThermalLayout
): string {
  const out: string[] = []
  const w = THERMAL_COLUMNS

  appendThermalHeaderLines(out, layout, w)
  if (receipt.companyTaxId) {
    appendThermalCenteredIfPresent(out, `Tax ID ${receipt.companyTaxId}`, w)
  }
  if (receipt.machineTaxId) {
    appendThermalCenteredIfPresent(out, `Machine ID ${receipt.machineTaxId}`, w)
  }
  appendThermalCenteredIfPresent(out, `${receipt.branchCode} ${receipt.branchName}`, w)
  appendThermalCenteredIfPresent(out, receipt.branchAddress, w)
  if (receipt.branchPhone) {
    appendThermalCenteredIfPresent(out, `Tel. ${receipt.branchPhone}`, w)
  }
  if (layout.showAbbreviatedTaxTitle) {
    const taxTitle = centerThermalLine("ใบกำกับภาษีอย่างย่อ", w)
    if (taxTitle) out.push(taxTitle)
  }

  out.push(repeatThermalChar("-", w))
  appendReceiptNo(out, receipt.receiptNo, w)
  out.push(padThermalLine("Date", formatThermalDateTime(receipt.issuedAt), w))
  if (receipt.cashierDisplay) {
    const cashier = receipt.cashierDisplay
    if (cashier.length <= w - 9) {
      out.push(padThermalLine("Cashier", cashier, w))
    } else {
      out.push("Cashier")
      out.push(cashier.length > w ? cashier.slice(0, w) : cashier)
    }
  }
  out.push(repeatThermalChar("-", w))

  const amountWidth = computeReceiptMaxAmountWidth(receipt)

  for (const item of receipt.lines) {
    const nameLine = truncateThermalText(item.name, w)
    if (nameLine) out.push(nameLine)
    out.push(formatReceiptItemDetailLine(item, w, amountWidth))
  }

  out.push(repeatThermalChar("-", w))
  out.push(formatThermalAmountLine("TOTAL", formatReceiptMoney(receipt.total), w, amountWidth))
  out.push(
    formatThermalAmountLine(
      "VAT 7%",
      calculateReceiptVat7FromInclusive(receipt.total),
      w,
      amountWidth
    )
  )
  out.push(
    formatThermalAmountLine(
      posReceiptSlipPaymentLabel(receipt.paymentMethod),
      formatReceiptMoney(receipt.cashAmount),
      w,
      amountWidth
    )
  )
  out.push(
    formatThermalAmountLine("CHANGE", formatReceiptMoney(receipt.change), w, amountWidth)
  )
  out.push(repeatThermalChar("-", w))

  if (layout.showVatIncludedMessage) {
    const line = centerThermalLine("ราคาสินค้ารวมภาษีมูลค่าเพิ่มแล้ว", w)
    if (line) out.push(line)
  }

  appendThermalFooterLines(out, layout, w)
  out.push("")
  return out.join("\n")
}
