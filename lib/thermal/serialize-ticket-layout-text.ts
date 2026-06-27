import { buildReadZGroupTableText } from "./read-z-group-table-text"
import type { ReceiptSlipRefStaff } from "./build-receipt-slip"
import { formatReceiptMachineLineForThermal } from "./receipt-machine-line"
import { appendRefundReasonPlainText } from "./refund-reason-text"
import { appendThermalCustomerAcknowledgement } from "./thermal-customer-ack"
import { serializeInfoBlockPlainText } from "./thermal-slip-info-block"
import type { ThermalTicketLayout } from "./ticket-layout-types"
import {
  THERMAL_COLUMNS,
  THERMAL_AMOUNT_MIN_GAP,
  appendThermalCenteredIfPresent,
  formatThermalAmountLine,
  padThermalLine,
} from "./format"
import { appendRepairTicketPhotoLines } from "./repair-ticket-photo-lines"

function appendBlockCenteredLines(
  lines: string[],
  blockLines: string[],
  width: number
): void {
  for (const line of blockLines) {
    appendThermalCenteredIfPresent(lines, line, width)
  }
}

export function serializeRefStaffPlainText(
  refStaff: ReceiptSlipRefStaff,
  width: number = THERMAL_COLUMNS
): string {
  const lines: string[] = []
  const dateWidth = refStaff.dateLine.length
  const fitsOneLine =
    refStaff.refLine.length + THERMAL_AMOUNT_MIN_GAP + dateWidth <= width

  if (fitsOneLine) {
    lines.push(formatThermalAmountLine(refStaff.refLine, refStaff.dateLine, width, dateWidth))
  } else if (refStaff.refLine.length <= width) {
    lines.push(refStaff.refLine)
    lines.push(
      refStaff.dateLine.length > width
        ? refStaff.dateLine.slice(0, width)
        : refStaff.dateLine.padStart(width, " ")
    )
  } else {
    lines.push("Ref.")
    const refValue = refStaff.refLine.replace(/^Ref\.\s*/, "")
    lines.push(refValue.length > width ? refValue.slice(0, width) : refValue)
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

/** Plain-text thermal serialization — must stay aligned with ThermalTicketSlipView. */
export function serializeTicketLayoutToText(
  layout: ThermalTicketLayout,
  width: number = THERMAL_COLUMNS
): string {
  const out: string[] = []

  appendBlockCenteredLines(out, layout.headerLines, width)
  for (const line of layout.identityBeforeMachineLines) {
    appendThermalCenteredIfPresent(out, line, width)
  }
  if (layout.machineTaxId) {
    const machineLine = formatReceiptMachineLineForThermal(layout.machineTaxId, width)
    if (machineLine.trim()) out.push(machineLine)
  }
  for (const line of layout.identityAfterMachineLines) {
    appendThermalCenteredIfPresent(out, line, width)
  }
  if (layout.refStaff) {
    out.push(serializeRefStaffPlainText(layout.refStaff, width))
  }
  if (layout.infoBlockRows?.length) {
    out.push(serializeInfoBlockPlainText(layout.infoBlockRows, width))
  }
  appendBlockCenteredLines(out, layout.subHeaderLines, width)
  if (layout.refundReason !== undefined) {
    appendRefundReasonPlainText(out, layout.refundReason, width)
    out.push("")
  }
  if (!layout.summaryAfterBody && layout.summaryRows?.length) {
    out.push(
      serializeInfoBlockPlainText(
        layout.summaryRows.map((row) => ({ kind: "label-value" as const, ...row })),
        width
      )
    )
  }
  if (layout.readZGroupLines) {
    out.push(buildReadZGroupTableText(layout.readZGroupLines, width))
  }
  if (layout.bodyText.trim()) {
    out.push(layout.bodyText.trim())
  }
  if (layout.repairPhotoFileNames?.length) {
    const photoLines: string[] = []
    appendRepairTicketPhotoLines(photoLines, layout.repairPhotoFileNames, width)
    out.push(photoLines.join("\n"))
  }
  if (layout.summaryAfterBody && layout.summaryRows?.length) {
    out.push(
      serializeInfoBlockPlainText(
        layout.summaryRows.map((row) => ({ kind: "label-value" as const, ...row })),
        width
      )
    )
  }
  appendBlockCenteredLines(out, layout.footerLines, width)
  if (layout.showCustomerAck) {
    appendThermalCustomerAcknowledgement(out, width, {
      writingGuides: layout.customerAckWritingGuides !== false,
      phoneLabel: layout.customerAckPhoneLabel,
      signLabel: layout.customerAckSignLabel,
      leadingDivider: layout.customerAckLeadingDivider,
      inlineGuides: layout.customerAckInlineGuides === true,
      stackedGuides: layout.customerAckStackedGuides === true,
      leadingBlank: layout.customerAckLeadingBlank === true,
      cutLine: layout.customerAckCutLine === true,
      cutSeparator: layout.customerAckCutSeparator === true,
    })
  }

  out.push("")
  return out.join("\n")
}
