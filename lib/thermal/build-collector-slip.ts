import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import type { ResolvedThermalLayout } from "./types"
import type { ReceiptBlockFontPx } from "./receipt-block-font-size"
import {
  resolveFooterBlockLines,
  resolveHeaderBlockLines,
  resolveSubHeaderBlockLines,
} from "./receipt-layout-blocks"
import { buildSlipIdentityParts } from "./receipt-slip-identity"
import {
  THERMAL_AMOUNT_COL_WIDTH,
  THERMAL_COLUMNS,
  centerThermalLine,
  formatThermalAmountLine,
  formatThermalDateTime,
  formatThermalMoney2,
  padThermalLine,
} from "./format"
import {
  READ_REPORT_PAYMENT_LABEL,
  READ_REPORT_PAYMENT_ORDER,
} from "@/lib/pos/readReportPayment"
import { buildTicketLayout } from "./build-ticket-layout"
import { serializeTicketLayoutToText } from "./serialize-ticket-layout-text"
import { buildThermalCustomerAcknowledgementText } from "./thermal-customer-ack"
import type { ThermalSlipInfoBlockRow } from "./thermal-slip-info-block"

function formatCollectorStaffDisplay(staffId: string, staffName: string): string {
  const name = staffName.trim()
  return name ? `${staffId} • ${name}` : staffId
}

function formatCollectorPeriod(report: ReadReportPayload): string {
  const from = report.bangkokDateFrom?.trim() || report.bangkokDate.trim()
  const to = report.bangkokDateTo?.trim() || from
  const fromDisplay = formatCollectorSalesDateDisplay(from)
  const toDisplay = formatCollectorSalesDateDisplay(to)
  return from === to ? fromDisplay : `${fromDisplay} - ${toDisplay}`
}

/** DD/MM/YYYY for thermal daily table (from Bangkok YYYY-MM-DD). */
export function formatCollectorSalesDateDisplay(ymd: string): string {
  const [y, m, d] = ymd.split("-")
  if (!y || !m || !d) return ymd
  return `${d}/${m}/${y}`
}

function buildCollectorDocumentInfoBlock(
  report: ReadReportPayload
): ThermalSlipInfoBlockRow[] {
  return [
    {
      kind: "label-value",
      label: "Collector:",
      value: formatCollectorStaffDisplay(report.staffId, report.staffName),
    },
    { kind: "label-value", label: "Period:", value: formatCollectorPeriod(report) },
    {
      kind: "label-value",
      label: "Printed:",
      value: formatThermalDateTime(report.generatedAt),
    },
    { kind: "blank" },
  ]
}

function buildCollectorSummaryRows(
  report: ReadReportPayload
): Array<{ label: string; value: string }> {
  return [{ label: "Receipt Count", value: String(report.saleCount) }]
}

/** Mono body — daily CASH table + TOTAL CASH row. */
export function buildCollectorSlipBodyText(report: ReadReportPayload): string {
  if (report.mode !== "COLLECT") {
    throw new Error("buildCollectorSlipBodyText requires COLLECT report")
  }

  const w = THERMAL_COLUMNS
  const lines: string[] = []
  const dailyLines = report.dailyCashLines ?? []

  lines.push(
    formatThermalAmountLine("Date", "Cash Sales", w, THERMAL_AMOUNT_COL_WIDTH)
  )

  if (dailyLines.length === 0) {
    lines.push(padThermalLine("No cash sales", formatThermalMoney2(0), w))
  } else {
    for (const row of dailyLines) {
      lines.push(
        padThermalLine(
          formatCollectorSalesDateDisplay(row.salesDateYmd),
          formatThermalMoney2(row.cashAmount),
          w
        )
      )
    }
  }

  lines.push("")
  lines.push(padThermalLine("TOTAL CASH", formatThermalMoney2(report.grandTotal), w))
  lines.push(...buildCollectorPaymentSummaryLines(report, w))

  return lines.join("\n")
}

function buildCollectorPaymentSummaryLines(
  report: ReadReportPayload,
  w: number
): string[] {
  const byKey = new Map((report.paymentLines ?? []).map((row) => [row.key, row]))
  const lines: string[] = [""]
  const heading = centerThermalLine("PAYMENT SUMMARY", w)
  if (heading) lines.push(heading)

  let totalSales = 0
  for (const key of READ_REPORT_PAYMENT_ORDER) {
    const row = byKey.get(key)
    const amount = row?.amount ?? 0
    totalSales += amount
    const label = row?.label ?? READ_REPORT_PAYMENT_LABEL[key]
    lines.push(padThermalLine(label, formatThermalMoney2(amount), w))
  }

  totalSales = Math.round(totalSales * 100) / 100
  lines.push(padThermalLine("TOTAL SALES", formatThermalMoney2(totalSales), w))
  return lines
}

export type CollectorSlipParts = {
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
  summaryRows: Array<{ label: string; value: string }>
  bodyText: string
  footerLines: string[]
  footerFontSize: ReceiptBlockFontPx
  footerBold: boolean
  acknowledgementText: string
}

export function buildCollectorSlipParts(
  report: ReadReportPayload,
  layout: ResolvedThermalLayout,
  identityContext?: {
    branchPhone?: string | null
    companyTaxId?: string | null
    machineTaxId?: string | null
  }
): CollectorSlipParts {
  if (report.mode !== "COLLECT") {
    throw new Error("buildCollectorSlipParts requires COLLECT report")
  }

  const w = THERMAL_COLUMNS
  const identityParts = buildSlipIdentityParts({
    branchCode: report.branchCode,
    branchName: report.branchName,
    branchPhone: identityContext?.branchPhone,
    machineTaxId: identityContext?.machineTaxId,
    companyTaxId: identityContext?.companyTaxId,
  })

  return {
    headerLines: resolveHeaderBlockLines(layout),
    headerFontSize: layout.headerFontSize,
    headerBold: layout.headerBlockBold,
    identityBeforeMachineLines: identityParts.beforeMachineLines,
    machineTaxId: identityParts.machineTaxId,
    identityAfterMachineLines: identityParts.afterMachineLines,
    infoBlockFontSize: layout.infoBlockFontSize,
    infoBlockBold: layout.infoBlockBold,
    infoBlockRows: buildCollectorDocumentInfoBlock(report),
    subHeaderLines: resolveSubHeaderBlockLines(layout),
    subHeaderFontSize: layout.subHeaderFontSize,
    subHeaderBold: layout.subHeaderBlockBold,
    summaryRows: buildCollectorSummaryRows(report),
    bodyText: buildCollectorSlipBodyText(report),
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

export function ticketLayoutFromCollectorParts(
  parts: CollectorSlipParts
): import("./ticket-layout-types").ThermalTicketLayout {
  return {
    headerLines: parts.headerLines,
    headerFontSize: parts.headerFontSize,
    headerBold: parts.headerBold,
    identityBeforeMachineLines: parts.identityBeforeMachineLines,
    machineTaxId: parts.machineTaxId,
    identityAfterMachineLines: parts.identityAfterMachineLines,
    infoBlockFontSize: parts.infoBlockFontSize,
    infoBlockBold: parts.infoBlockBold,
    refStaff: null,
    infoBlockRows: parts.infoBlockRows,
    subHeaderLines: parts.subHeaderLines,
    subHeaderFontSize: parts.subHeaderFontSize,
    subHeaderBold: parts.subHeaderBold,
    bodyText: parts.bodyText,
    summaryRows: parts.summaryRows,
    summaryAfterBody: true,
    footerLines: parts.footerLines,
    footerFontSize: parts.footerFontSize,
    footerBold: parts.footerBold,
    showCustomerAck: true,
    customerAckWritingGuides: true,
    customerAckPhoneLabel: "Phone No.",
    customerAckSignLabel: "Sign",
    customerAckLeadingDivider: false,
    customerAckLeadingBlank: true,
    customerAckInlineGuides: true,
    customerAckBodyIndent: true,
    customerAckCutSeparator: true,
  }
}

/** Thermal collector ticket from on-screen COLLECT payload — no fetch. */
export function buildCollectorSlipText(
  report: ReadReportPayload,
  layout: ResolvedThermalLayout
): string {
  if (report.mode !== "COLLECT") {
    throw new Error("buildCollectorSlipText requires COLLECT report")
  }

  return serializeTicketLayoutToText(
    buildTicketLayout({ documentType: "COLLECTOR", report, layout })
  )
}
