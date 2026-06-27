import type { ReceiptPrintContext } from "@/lib/pos/receipt-print-context"
import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import {
  resolveFooterBlockLines,
  resolveHeaderBlockLines,
  resolveSubHeaderBlockLines,
} from "./receipt-layout-blocks"
import { buildSlipIdentityParts } from "./receipt-slip-identity"
import { buildReceiptSlipParts, type ReceiptSlipParts } from "./build-receipt-slip"
import { buildRefundSlipParts, type RefundSlipParts } from "./build-refund-slip"
import { buildCollectorSlipParts, ticketLayoutFromCollectorParts } from "./build-collector-slip"
import {
  buildRepairTicketSlipBodyText,
  buildRepairTicketSlipInfoBlock,
  type RepairTicketSlipInput,
} from "./build-repair-ticket-slip"
import { buildReadZSlipBodyText, buildReadZSlipTailText } from "./build-read-z-slip"
import { buildReadZSlipInfoBlock } from "./build-read-z-info-block"
import { formatThermalBangkokPrintTime, formatThermalDateTime } from "./format"
import type { ResolvedThermalLayout, ThermalDocumentType } from "./types"
import type { ThermalTicketLayout } from "./ticket-layout-types"

type BranchLabel = { code: string; name: string }

function stripLeadingBranchFromBodyText(bodyText: string, branch: BranchLabel): string {
  const lines = bodyText.split("\n")
  if (lines.length === 0) return bodyText

  const first = lines[0]?.trim() ?? ""
  const branchLabel = `${branch.code} ${branch.name}`.trim()
  const matchesBranch =
    first === branch.name.trim() ||
    first === branch.code.trim() ||
    first === branchLabel ||
    first.includes(branch.name.trim())

  if (!matchesBranch) return bodyText

  let index = 1
  while (index < lines.length && !lines[index]?.trim()) {
    index += 1
  }
  return lines.slice(index).join("\n")
}

type SlipIdentityContext = {
  branchPhone?: string | null
  companyTaxId?: string | null
  machineTaxId?: string | null
}

export function ticketLayoutFromReceiptParts(parts: ReceiptSlipParts): ThermalTicketLayout {
  return {
    headerLines: parts.headerLines,
    headerFontSize: parts.headerFontSize,
    headerBold: parts.headerBold,
    identityBeforeMachineLines: parts.identityBeforeMachineLines,
    machineTaxId: parts.machineTaxId,
    identityAfterMachineLines: parts.identityAfterMachineLines,
    infoBlockFontSize: parts.infoBlockFontSize,
    infoBlockBold: parts.infoBlockBold,
    refStaff: parts.refStaff,
    subHeaderLines: parts.subHeaderLines,
    subHeaderFontSize: parts.subHeaderFontSize,
    subHeaderBold: parts.subHeaderBold,
    bodyText: parts.monoText,
    footerLines: parts.footerLines,
    footerFontSize: parts.footerFontSize,
    footerBold: parts.footerBold,
    showCustomerAck: false,
  }
}

export function ticketLayoutFromRefundParts(parts: RefundSlipParts): ThermalTicketLayout {
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
    bodyText: parts.refundBodyText,
    refundReason: parts.refundReason,
    summaryRows: parts.summaryRows,
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

function resolveLayoutBlocks(layout: ResolvedThermalLayout) {
  return {
    headerLines: resolveHeaderBlockLines(layout),
    headerFontSize: layout.headerFontSize,
    headerBold: layout.headerBlockBold,
    subHeaderLines: resolveSubHeaderBlockLines(layout),
    subHeaderFontSize: layout.subHeaderFontSize,
    subHeaderBold: layout.subHeaderBlockBold,
    footerLines: resolveFooterBlockLines(layout),
    footerFontSize: layout.footerFontSize,
    footerBold: layout.footerBlockBold,
    infoBlockFontSize: layout.infoBlockFontSize,
    infoBlockBold: layout.infoBlockBold,
  }
}

function buildReportRefStaff(input: {
  refLine: string
  generatedAt: string
  staffId: string
  staffName: string
}) {
  const staffName = input.staffName.trim()
  const staffValue = staffName ? `${input.staffId} • ${staffName}` : input.staffId
  return {
    refLine: input.refLine,
    dateLine: formatThermalBangkokPrintTime(input.generatedAt),
    staffLabel: "Staff",
    staffValue,
  }
}

function buildReportTicketLayout(input: {
  layout: ResolvedThermalLayout
  branchCode: string
  branchName: string
  generatedAt: string
  staffId: string
  staffName: string
  refLine: string
  bodyText: string
  identityContext?: SlipIdentityContext
  infoBlockRows?: import("./thermal-slip-info-block").ThermalSlipInfoBlockRow[]
  readZGroupLines?: import("@/lib/pos/aggregatePosReadReport").ReadReportGroupLine[]
}): ThermalTicketLayout {
  const identity = buildSlipIdentityParts({
    branchCode: input.branchCode,
    branchName: input.branchName,
    branchPhone: input.identityContext?.branchPhone,
    machineTaxId: input.identityContext?.machineTaxId,
    companyTaxId: input.identityContext?.companyTaxId,
  })

  return {
    ...resolveLayoutBlocks(input.layout),
    identityBeforeMachineLines: identity.beforeMachineLines,
    machineTaxId: identity.machineTaxId,
    identityAfterMachineLines: identity.afterMachineLines,
    refStaff: buildReportRefStaff({
      refLine: input.refLine,
      generatedAt: input.generatedAt,
      staffId: input.staffId,
      staffName: input.staffName,
    }),
    infoBlockRows: input.infoBlockRows,
    readZGroupLines: input.readZGroupLines,
    bodyText: input.bodyText,
    showCustomerAck: true,
  }
}

export type BuildTicketLayoutInput =
  | {
      documentType: "RECEIPT"
      receipt: ReceiptPrintContext
      layout: ResolvedThermalLayout
    }
  | {
      documentType: "REFUND"
      refund: RefundReceiptPrintContext
      layout: ResolvedThermalLayout
    }
  | {
      documentType: "COLLECTOR"
      report: ReadReportPayload
      layout: ResolvedThermalLayout
      identityContext?: SlipIdentityContext
    }
  | {
      documentType: "REPAIR_TICKET"
      ticket: RepairTicketSlipInput
      layout: ResolvedThermalLayout
      branchCode: string
      staffId?: string
      staffName?: string
      identityContext?: SlipIdentityContext
    }
  | {
      documentType: "READ_Z"
      report: ReadReportPayload
      layout: ResolvedThermalLayout
      identityContext?: SlipIdentityContext
    }

export function buildTicketLayout(input: BuildTicketLayoutInput): ThermalTicketLayout {
  switch (input.documentType) {
    case "RECEIPT":
      return ticketLayoutFromReceiptParts(
        buildReceiptSlipParts(input.receipt, input.layout)
      )
    case "REFUND":
      return ticketLayoutFromRefundParts(
        buildRefundSlipParts(input.refund, input.layout)
      )
    case "COLLECTOR": {
      const { report, layout, identityContext } = input
      return ticketLayoutFromCollectorParts(
        buildCollectorSlipParts(report, layout, identityContext)
      )
    }
    case "REPAIR_TICKET":
      return buildRepairTicketLayout({
        ticket: input.ticket,
        layout: input.layout,
        branchCode: input.branchCode,
        staffId: input.staffId,
        staffName: input.staffName,
        identityContext: input.identityContext,
      })
    case "READ_Z": {
      const { report, layout, identityContext } = input
      const bodyText = stripLeadingBranchFromBodyText(
        buildReadZSlipTailText(report),
        { code: report.branchCode, name: report.branchName }
      )
      const viewYmd =
        report.bangkokDateTo ??
        report.readZViewDate ??
        report.bangkokDate.split(" – ").pop()?.trim() ??
        report.bangkokDate
      const dateKey = viewYmd.replace(/-/g, "")
      const refSuffix =
        report.readZScope === "cumulative-to-date" ? "-YTD" : ""
      return buildReportTicketLayout({
        layout,
        branchCode: report.branchCode,
        branchName: report.branchName,
        generatedAt: report.generatedAt,
        staffId: report.staffId,
        staffName: report.staffName,
        refLine: `Ref. READZ-${report.branchCode}-${dateKey}${refSuffix}`,
        bodyText,
        infoBlockRows: buildReadZSlipInfoBlock(report),
        readZGroupLines: report.groupLines,
        identityContext,
      })
    }
    default: {
      const _exhaustive: never = input
      return _exhaustive
    }
  }
}

export function buildTicketLayoutForDocumentType(
  documentType: ThermalDocumentType,
  input: Omit<BuildTicketLayoutInput, "documentType">
): ThermalTicketLayout {
  return buildTicketLayout({ ...input, documentType } as BuildTicketLayoutInput)
}

/** Repair ticket layout with branch code for identity strip. */
export function buildRepairTicketLayout(input: {
  ticket: RepairTicketSlipInput
  layout: ResolvedThermalLayout
  branchCode: string
  staffId?: string
  staffName?: string
  identityContext?: SlipIdentityContext
}): ThermalTicketLayout {
  return {
    ...buildReportTicketLayout({
      layout: input.layout,
      branchCode: input.branchCode,
      branchName: input.ticket.branchName,
      generatedAt: input.ticket.issuedAt,
      staffId: input.staffId ?? "",
      staffName: input.staffName ?? "",
      refLine: `Ref. ${input.ticket.ticketNo}`,
      bodyText: buildRepairTicketSlipBodyText(input.ticket, { omitPhotoList: true }),
      infoBlockRows: buildRepairTicketSlipInfoBlock(input.ticket),
      identityContext: input.identityContext,
    }),
    repairPhotoFileNames:
      input.ticket.fileNames.length > 0 ? [...input.ticket.fileNames] : undefined,
    customerAckWritingGuides: true,
    customerAckLeadingDivider: false,
    customerAckLeadingBlank: true,
    customerAckInlineGuides: true,
    customerAckBodyIndent: true,
    customerAckCutSeparator: true,
  }
}

export function buildReceiptRefStaffFromContext(receipt: ReceiptPrintContext) {
  return {
    refLine: `Ref. ${receipt.receiptNo}`,
    dateLine: formatThermalDateTime(receipt.issuedAt),
    staffLabel: "Staff",
    staffValue: receipt.cashierDisplay?.trim() || "",
  }
}
