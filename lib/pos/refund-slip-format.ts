import { DEFAULT_RECEIPT_PRINT_SETTINGS } from "@/lib/receipt-settings/defaults"
import type { RefundReceiptPrintContext } from "./refund-receipt-print-context"
import {
  RECEIPT_COLUMNS,
  centerReceiptLine,
  formatReceiptAmountLine,
  formatReceiptDateTime,
  formatReceiptMoney,
  padReceiptLine,
  repeatReceiptChar,
  truncateReceiptText,
  wrapReceiptTextLines,
} from "./receipt-slip-format"

function appendCenteredIfPresent(
  lines: string[],
  text: string | null | undefined,
  width: number
): void {
  const t = text?.trim()
  if (!t) return
  if (t.length <= width) {
    const centered = centerReceiptLine(t, width)
    if (centered) lines.push(centered)
    return
  }
  for (const chunk of wrapReceiptTextLines(t, width)) {
    const centered = centerReceiptLine(chunk, width)
    if (centered) lines.push(centered)
  }
}

function appendLabelValue(
  lines: string[],
  label: string,
  value: string,
  width: number
): void {
  const gap = label.length + 1
  if (value.length <= width - gap) {
    lines.push(padReceiptLine(label, value, width))
    return
  }
  lines.push(label)
  const trimmed = value.length > width ? value.slice(0, width) : value
  lines.push(trimmed)
}

function formatRefundKindLabel(kind: RefundReceiptPrintContext["kind"]): string {
  return kind === "SALE_LINKED" ? "SALE LINKED" : "GOODWILL"
}

export function buildRefundSlipText(context: RefundReceiptPrintContext): string {
  const out: string[] = []
  const w = RECEIPT_COLUMNS
  const settings = context.settings ?? DEFAULT_RECEIPT_PRINT_SETTINGS

  appendCenteredIfPresent(out, context.companyDisplayName, w)
  if (context.companyTaxId) {
    appendCenteredIfPresent(out, `Tax ID ${context.companyTaxId}`, w)
  }
  if (context.machineTaxId) {
    appendCenteredIfPresent(out, `Machine ID ${context.machineTaxId}`, w)
  }
  appendCenteredIfPresent(out, `${context.branchCode} ${context.branchName}`, w)
  appendCenteredIfPresent(out, context.branchAddress, w)
  if (context.branchPhone) {
    appendCenteredIfPresent(out, `Tel. ${context.branchPhone}`, w)
  }

  const title = centerReceiptLine("REFUND RECEIPT", w)
  if (title) out.push(title)

  out.push(repeatReceiptChar("-", w))
  appendLabelValue(out, "Refund No", context.refundNo, w)

  if (context.kind === "SALE_LINKED" && context.originalReceiptNo) {
    appendLabelValue(out, "Orig Receipt", context.originalReceiptNo, w)
  }

  out.push(padReceiptLine("Date", formatReceiptDateTime(context.issuedAt), w))

  if (context.cashierDisplay) {
    const staff = context.cashierDisplay
    if (staff.length <= w - 6) {
      out.push(padReceiptLine("Staff", staff, w))
    } else {
      out.push("Staff")
      out.push(staff.length > w ? staff.slice(0, w) : staff)
    }
  }

  out.push(padReceiptLine("Type", formatRefundKindLabel(context.kind), w))

  if (context.reason?.trim()) {
    const reasonLine = truncateReceiptText(context.reason.trim(), w)
    if (reasonLine) {
      out.push("Reason")
      out.push(reasonLine)
    }
  }

  out.push(repeatReceiptChar("-", w))

  const amountText = formatReceiptMoney(context.amount)
  const amountWidth = Math.max(4, amountText.length)
  out.push(
    formatReceiptAmountLine("REFUND", amountText, w, amountWidth)
  )

  out.push(repeatReceiptChar("-", w))

  const footers = [
    settings.footerLine1,
    settings.footerLine2,
    settings.footerLine3,
    settings.footerLine4,
    settings.footerLine5,
  ]
  for (const footer of footers) {
    appendCenteredIfPresent(out, footer, w)
  }

  out.push("")
  return out.join("\n")
}
