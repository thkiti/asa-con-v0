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
import {
  THERMAL_COLUMNS,
  formatThermalDateTime,
} from "./format"
import { buildTicketLayout } from "./build-ticket-layout"
import { serializeTicketLayoutToText } from "./serialize-ticket-layout-text"
import { buildThermalCustomerAcknowledgementText } from "./thermal-customer-ack"
import type { ThermalSlipInfoBlockRow } from "./thermal-slip-info-block"

function formatRefundStaffDisplay(cashierDisplay: string): string {
  const trimmed = cashierDisplay.trim()
  const dash = trimmed.indexOf("-")
  if (dash <= 0) return trimmed
  return `${trimmed.slice(0, dash)} • ${trimmed.slice(dash + 1).trim()}`
}

function buildRefundDocumentInfoBlock(
  context: RefundReceiptPrintContext
): ThermalSlipInfoBlockRow[] {
  const rows: ThermalSlipInfoBlockRow[] = [
    { kind: "label-value", label: "Ref. No.", value: context.refundNo },
    { kind: "divider" },
  ]

  if (context.kind === "SALE_LINKED" && context.originalReceiptNo) {
    rows.push({
      kind: "label-value",
      label: "Original Receipt No.",
      value: context.originalReceiptNo,
    })

    if (context.originalReceiptTotal) {
      rows.push({
        kind: "label-value",
        label: "TOTAL AMOUNT",
        value: formatReceiptMoney(context.originalReceiptTotal),
      })
    }

    rows.push({ kind: "blank" })
  }

  rows.push({
    kind: "label-value",
    label: "Date:",
    value: formatThermalDateTime(context.issuedAt),
  })

  if (context.cashierDisplay?.trim()) {
    rows.push({
      kind: "label-value",
      label: "Staff:",
      value: formatRefundStaffDisplay(context.cashierDisplay),
    })
  }

  rows.push({ kind: "blank" })

  return rows
}

function buildRefundSummaryRows(
  context: RefundReceiptPrintContext
): Array<{ label: string; value: string }> {
  return [
    {
      label: "REFUND AMOUNT",
      value: formatReceiptMoney(context.amount),
    },
  ]
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
  infoBlockRows: ThermalSlipInfoBlockRow[]
  subHeaderLines: string[]
  subHeaderFontSize: ReceiptBlockFontPx
  subHeaderBold: boolean
  refundReason: string | null
  summaryRows: Array<{ label: string; value: string }>
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

  return {
    headerLines: resolveHeaderBlockLines(layout),
    headerFontSize: layout.headerFontSize,
    headerBold: layout.headerBlockBold,
    identityBeforeMachineLines: identityParts.beforeMachineLines,
    machineTaxId: identityParts.machineTaxId,
    identityAfterMachineLines: identityParts.afterMachineLines,
    infoBlockFontSize: layout.infoBlockFontSize,
    infoBlockBold: layout.infoBlockBold,
    infoBlockRows: buildRefundDocumentInfoBlock(context),
    subHeaderLines: resolveSubHeaderBlockLines(layout),
    subHeaderFontSize: layout.subHeaderFontSize,
    subHeaderBold: layout.subHeaderBlockBold,
    refundReason: context.reason?.trim() || null,
    summaryRows: buildRefundSummaryRows(context),
    refundBodyText: "",
    footerLines: resolveFooterBlockLines(layout),
    footerFontSize: layout.footerFontSize,
    footerBold: layout.footerBlockBold,
    acknowledgementText: buildThermalCustomerAcknowledgementText(w, {
      writingGuides: true,
      leadingDivider: false,
      leadingBlank: true,
      inlineGuides: true,
      cutSeparator: true,
      phoneLabel: "Phone No.",
    }),
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
