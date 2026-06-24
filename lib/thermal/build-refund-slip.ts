import { formatReceiptMoney } from "@/lib/pos/receipt-money"
import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import type { ResolvedThermalLayout } from "./types"
import type { ReceiptBlockFontPx } from "./receipt-block-font-size"
import {
  resolveFooterBlockLines,
  resolveHeaderBlockLines,
  resolveSubHeaderBlockLines,
} from "./receipt-layout-blocks"
import { buildSlipIdentityParts } from "./receipt-slip-identity"
import { formatReceiptMachineLineForThermal } from "./receipt-machine-line"
import type { ReceiptSlipRefStaff } from "@/lib/thermal/build-receipt-slip"
import {
  THERMAL_COLUMNS,
  appendThermalCenteredIfPresent,
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

function appendReceiptBlockCenteredLines(
  lines: string[],
  blockLines: string[],
  width: number
): void {
  for (const line of blockLines) {
    appendThermalCenteredIfPresent(lines, line, width)
  }
}

function formatRefundKindLabel(kind: RefundReceiptPrintContext["kind"]): string {
  return kind === "SALE_LINKED" ? "SALE LINKED" : "GOODWILL"
}

import { buildTicketLayout } from "./build-ticket-layout"
import { serializeTicketLayoutToText } from "./serialize-ticket-layout-text"
import { buildThermalCustomerAcknowledgementText } from "./thermal-customer-ack"

function buildRefundBodyLines(context: RefundReceiptPrintContext, width: number): string[] {
  const body: string[] = []

  const title = centerThermalLine("REFUND RECEIPT", width)
  if (title) body.push(title)

  body.push(repeatThermalChar("-", width))
  appendLabelValue(body, "Refund No", context.refundNo, width)

  if (context.kind === "SALE_LINKED" && context.originalReceiptNo) {
    appendLabelValue(body, "ORIGINAL RECEIPT NO", context.originalReceiptNo, width)
  }

  body.push(padThermalLine("Date", formatThermalDateTime(context.issuedAt), width))

  if (context.cashierDisplay) {
    const staff = context.cashierDisplay
    if (staff.length <= width - 6) {
      body.push(padThermalLine("Staff", staff, width))
    } else {
      body.push("Staff")
      body.push(staff.length > width ? staff.slice(0, width) : staff)
    }
  }

  body.push(padThermalLine("Type", formatRefundKindLabel(context.kind), width))

  if (context.reason?.trim()) {
    const reasonLine = truncateThermalText(context.reason.trim(), width)
    if (reasonLine) {
      body.push("Reason")
      body.push(reasonLine)
    }
  }

  body.push(repeatThermalChar("-", width))

  const amountText = formatReceiptMoney(context.amount)
  const amountWidth = Math.max(4, amountText.length)
  body.push(formatThermalAmountLine("REFUND", amountText, width, amountWidth))

  body.push(repeatThermalChar("-", width))
  return body
}

function buildRefundRefStaffData(context: RefundReceiptPrintContext): ReceiptSlipRefStaff {
  return {
    refLine: `Ref. ${context.refundNo}`,
    dateLine: formatThermalDateTime(context.issuedAt),
    staffLabel: "Staff",
    staffValue: context.cashierDisplay?.trim() || "",
  }
}

export type RefundSlipParts = {
  headerLines: string[]
  headerFontSize: ReceiptBlockFontPx
  headerBold: boolean
  identityBeforeMachineLines: string[]
  machineTaxId: string | null
  identityAfterMachineLines: string[]
  infoBlockFontSize: ReceiptBlockFontPx
  infoBlockBold: boolean
  refStaff: ReceiptSlipRefStaff
  subHeaderLines: string[]
  subHeaderFontSize: ReceiptBlockFontPx
  subHeaderBold: boolean
  refundBodyText: string
  footerLines: string[]
  footerFontSize: ReceiptBlockFontPx
  footerBold: boolean
  acknowledgementText: string
}

export function buildRefundSlipParts(
  context: RefundReceiptPrintContext,
  layout: ResolvedThermalLayout
): RefundSlipParts {
  const w = THERMAL_COLUMNS
  const identityParts = buildSlipIdentityParts(context)
  const refundBodyLines = buildRefundBodyLines(context, w)

  return {
    headerLines: resolveHeaderBlockLines(layout),
    headerFontSize: layout.headerFontSize,
    headerBold: layout.headerBlockBold,
    identityBeforeMachineLines: identityParts.beforeMachineLines,
    machineTaxId: identityParts.machineTaxId,
    identityAfterMachineLines: identityParts.afterMachineLines,
    infoBlockFontSize: layout.infoBlockFontSize,
    infoBlockBold: layout.infoBlockBold,
    refStaff: buildRefundRefStaffData(context),
    subHeaderLines: resolveSubHeaderBlockLines(layout),
    subHeaderFontSize: layout.subHeaderFontSize,
    subHeaderBold: layout.subHeaderBlockBold,
    refundBodyText: refundBodyLines.join("\n"),
    footerLines: resolveFooterBlockLines(layout),
    footerFontSize: layout.footerFontSize,
    footerBold: layout.footerBlockBold,
    acknowledgementText: buildThermalCustomerAcknowledgementText(w),
  }
}

export function buildRefundSlipText(
  context: RefundReceiptPrintContext,
  layout: ResolvedThermalLayout
): string {
  return serializeTicketLayoutToText(
    buildTicketLayout({ documentType: "REFUND", refund: context, layout })
  )
}
