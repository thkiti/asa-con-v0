import { formatReceiptMoney } from "@/lib/pos/receipt-money"
import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import type { ResolvedThermalLayout } from "./types"
import {
  THERMAL_COLUMNS,
  appendThermalCenteredIfPresent,
  appendThermalFooterLines,
  appendThermalHeaderLines,
  centerThermalLine,
  formatThermalAmountLine,
  formatThermalDateTime,
  padThermalLine,
  repeatThermalChar,
  truncateThermalText,
} from "./format"

function appendLabelValue(
  lines: string[],
  label: string,
  value: string,
  width: number
): void {
  const gap = label.length + 1
  if (value.length <= width - gap) {
    lines.push(padThermalLine(label, value, width))
    return
  }
  lines.push(label)
  const trimmed = value.length > width ? value.slice(0, width) : value
  lines.push(trimmed)
}

function formatRefundKindLabel(kind: RefundReceiptPrintContext["kind"]): string {
  return kind === "SALE_LINKED" ? "SALE LINKED" : "GOODWILL"
}

function appendCustomerAcknowledgement(lines: string[], width: number): void {
  lines.push(repeatThermalChar("-", width))
  lines.push("")
  lines.push("Phone No")
  lines.push("")
  lines.push(repeatThermalChar(".", width))
  lines.push("")
  lines.push("Sign")
  lines.push("")
  lines.push(repeatThermalChar(".", width))
}

export function buildRefundSlipText(
  context: RefundReceiptPrintContext,
  layout: ResolvedThermalLayout
): string {
  const out: string[] = []
  const w = THERMAL_COLUMNS

  appendThermalHeaderLines(out, layout, w)
  if (context.companyTaxId) {
    appendThermalCenteredIfPresent(out, `Tax ID ${context.companyTaxId}`, w)
  }
  if (context.machineTaxId) {
    appendThermalCenteredIfPresent(out, `Machine ID ${context.machineTaxId}`, w)
  }
  appendThermalCenteredIfPresent(out, `${context.branchCode} ${context.branchName}`, w)
  appendThermalCenteredIfPresent(out, context.branchAddress, w)
  if (context.branchPhone) {
    appendThermalCenteredIfPresent(out, `Tel. ${context.branchPhone}`, w)
  }

  const title = centerThermalLine("REFUND RECEIPT", w)
  if (title) out.push(title)

  out.push(repeatThermalChar("-", w))
  appendLabelValue(out, "Refund No", context.refundNo, w)

  if (context.kind === "SALE_LINKED" && context.originalReceiptNo) {
    appendLabelValue(out, "ORIGINAL RECEIPT NO", context.originalReceiptNo, w)
  }

  out.push(padThermalLine("Date", formatThermalDateTime(context.issuedAt), w))

  if (context.cashierDisplay) {
    const staff = context.cashierDisplay
    if (staff.length <= w - 6) {
      out.push(padThermalLine("Staff", staff, w))
    } else {
      out.push("Staff")
      out.push(staff.length > w ? staff.slice(0, w) : staff)
    }
  }

  out.push(padThermalLine("Type", formatRefundKindLabel(context.kind), w))

  if (context.reason?.trim()) {
    const reasonLine = truncateThermalText(context.reason.trim(), w)
    if (reasonLine) {
      out.push("Reason")
      out.push(reasonLine)
    }
  }

  out.push(repeatThermalChar("-", w))

  const amountText = formatReceiptMoney(context.amount)
  const amountWidth = Math.max(4, amountText.length)
  out.push(formatThermalAmountLine("REFUND", amountText, w, amountWidth))

  out.push(repeatThermalChar("-", w))
  appendThermalFooterLines(out, layout, w)
  appendCustomerAcknowledgement(out, w)

  out.push("")
  return out.join("\n")
}
