import { formatReceiptMoney } from "@/lib/pos/receipt-money"
import { calculateReceiptVat7FromInclusive } from "@/lib/pos/receipt-vat-display"
import type { ReceiptPrintContext } from "@/lib/pos/receipt-print-context"
import { posReceiptSlipPaymentLabel } from "@/lib/pos-ui/pos-payment-methods"
import type { ResolvedThermalLayout } from "./types"
import type { ReceiptBlockFontPx } from "./receipt-block-font-size"
import { buildTicketLayout } from "./build-ticket-layout"
import { serializeTicketLayoutToText } from "./serialize-ticket-layout-text"
import {
  resolveFooterBlockLines,
  resolveHeaderBlockLines,
  resolveSubHeaderBlockLines,
} from "./receipt-layout-blocks"
import { buildSlipIdentityParts } from "./receipt-slip-identity"
import {
  formatReceiptMachineLineForThermal,
} from "./receipt-machine-line"
import {
  THERMAL_COLUMNS,
  THERMAL_AMOUNT_MIN_GAP,
  appendThermalCenteredIfPresent,
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

function appendReceiptBlockCenteredLines(
  lines: string[],
  blockLines: string[],
  width: number
): void {
  for (const line of blockLines) {
    appendThermalCenteredIfPresent(lines, line, width)
  }
}

export type ReceiptSlipRefStaff = {
  refLine: string
  dateLine: string
  staffLabel: string
  staffValue: string
}

export type ReceiptSlipParts = {
  headerLines: string[]
  headerFontSize: ReceiptBlockFontPx
  headerBold: boolean
  identityLines: string[]
  identityBeforeMachineLines: string[]
  machineTaxId: string | null
  identityAfterMachineLines: string[]
  infoBlockFontSize: ReceiptBlockFontPx
  infoBlockBold: boolean
  refStaff: ReceiptSlipRefStaff | null
  subHeaderLines: string[]
  subHeaderFontSize: ReceiptBlockFontPx
  subHeaderBold: boolean
  monoText: string
  footerLines: string[]
  footerFontSize: ReceiptBlockFontPx
  footerBold: boolean
}

function buildIdentityParts(receipt: ReceiptPrintContext) {
  return buildSlipIdentityParts(receipt)
}

/** @deprecated Use identityBeforeMachineLines + machineTaxId + identityAfterMachineLines */
function buildIdentityLines(receipt: ReceiptPrintContext): string[] {
  const parts = buildIdentityParts(receipt)
  const lines = [...parts.beforeMachineLines]
  if (parts.machineTaxId) {
    lines.push(formatReceiptMachineLineForThermal(parts.machineTaxId, THERMAL_COLUMNS).trim())
  }
  lines.push(...parts.afterMachineLines)
  return lines
}

function buildRefStaffData(receipt: ReceiptPrintContext): ReceiptSlipRefStaff {
  return {
    refLine: `Ref. ${receipt.receiptNo}`,
    dateLine: formatThermalDateTime(receipt.issuedAt),
    staffLabel: "Staff",
    staffValue: receipt.cashierDisplay?.trim() || "",
  }
}

function buildRefStaffPlainText(receipt: ReceiptPrintContext, width: number): string {
  const lines: string[] = []
  const refStaff = buildRefStaffData(receipt)
  const dateWidth = refStaff.dateLine.length
  const fitsOneLine =
    refStaff.refLine.length + THERMAL_AMOUNT_MIN_GAP + dateWidth <= width

  if (fitsOneLine) {
    lines.push(
      formatThermalAmountLine(refStaff.refLine, refStaff.dateLine, width, dateWidth)
    )
  } else if (refStaff.refLine.length <= width) {
    lines.push(refStaff.refLine)
    lines.push(
      refStaff.dateLine.length > width
        ? refStaff.dateLine.slice(0, width)
        : refStaff.dateLine.padStart(width, " ")
    )
  } else {
    lines.push("Ref.")
    const receiptNo = receipt.receiptNo
    lines.push(receiptNo.length > width ? receiptNo.slice(0, width) : receiptNo)
    lines.push(
      refStaff.dateLine.length > width
        ? refStaff.dateLine.slice(0, width)
        : refStaff.dateLine.padStart(width, " ")
    )
  }

  if (refStaff.staffValue) {
    const cashier = refStaff.staffValue
    if (cashier.length <= width - 6) {
      lines.push(padThermalLine(refStaff.staffLabel, cashier, width))
    } else {
      lines.push(refStaff.staffLabel)
      lines.push(cashier.length > width ? cashier.slice(0, width) : cashier)
    }
  }
  return lines.join("\n")
}

export function buildReceiptSlipParts(
  receipt: ReceiptPrintContext,
  layout: ResolvedThermalLayout
): ReceiptSlipParts {
  const monoLines: string[] = []
  const w = THERMAL_COLUMNS

  monoLines.push(repeatThermalChar("-", w))

  const amountWidth = computeReceiptMaxAmountWidth(receipt)

  for (const item of receipt.lines) {
    const nameLine = truncateThermalText(item.name, w)
    if (nameLine) monoLines.push(nameLine)
    monoLines.push(formatReceiptItemDetailLine(item, w, amountWidth))
  }

  monoLines.push(repeatThermalChar("-", w))
  monoLines.push(
    formatThermalAmountLine("TOTAL", formatReceiptMoney(receipt.total), w, amountWidth)
  )
  monoLines.push(
    formatThermalAmountLine(
      "VAT 7%",
      calculateReceiptVat7FromInclusive(receipt.total),
      w,
      amountWidth
    )
  )
  monoLines.push(
    formatThermalAmountLine(
      posReceiptSlipPaymentLabel(receipt.paymentMethod),
      formatReceiptMoney(receipt.cashAmount),
      w,
      amountWidth
    )
  )
  monoLines.push(
    formatThermalAmountLine("CHANGE", formatReceiptMoney(receipt.change), w, amountWidth)
  )
  monoLines.push(repeatThermalChar("-", w))

  const identityParts = buildIdentityParts(receipt)

  return {
    headerLines: resolveHeaderBlockLines(layout),
    headerFontSize: layout.headerFontSize,
    headerBold: layout.headerBlockBold,
    identityLines: buildIdentityLines(receipt),
    identityBeforeMachineLines: identityParts.beforeMachineLines,
    machineTaxId: identityParts.machineTaxId,
    identityAfterMachineLines: identityParts.afterMachineLines,
    refStaff: buildRefStaffData(receipt),
    subHeaderLines: resolveSubHeaderBlockLines(layout),
    subHeaderFontSize: layout.subHeaderFontSize,
    subHeaderBold: layout.subHeaderBlockBold,
    monoText: monoLines.join("\n"),
    footerLines: resolveFooterBlockLines(layout),
    footerFontSize: layout.footerFontSize,
    footerBold: layout.footerBlockBold,
    infoBlockFontSize: layout.infoBlockFontSize,
    infoBlockBold: layout.infoBlockBold,
  }
}

export function buildReceiptSlipText(
  receipt: ReceiptPrintContext,
  layout: ResolvedThermalLayout
): string {
  return serializeTicketLayoutToText(
    buildTicketLayout({ documentType: "RECEIPT", receipt, layout })
  )
}
