import type { ReadReportGroupLine } from "@/lib/pos/aggregatePosReadReport"
import type { ReceiptBlockFontPx } from "./receipt-block-font-size"
import type { ReceiptSlipRefStaff } from "./build-receipt-slip"
import type { ThermalSlipInfoBlockRow } from "./thermal-slip-info-block"

/** Single source of truth for thermal ticket visual layout (preview + print). */
export type ThermalTicketLayout = {
  headerLines: string[]
  headerFontSize: ReceiptBlockFontPx
  headerBold: boolean
  identityBeforeMachineLines: string[]
  machineTaxId: string | null
  identityAfterMachineLines: string[]
  infoBlockFontSize: ReceiptBlockFontPx
  infoBlockBold: boolean
  refStaff: ReceiptSlipRefStaff | null
  /** Refund document rows — same left/right alignment as receipt refStaff block. */
  infoBlockRows?: ThermalSlipInfoBlockRow[]
  subHeaderLines: string[]
  subHeaderFontSize: ReceiptBlockFontPx
  subHeaderBold: boolean
  /** READ Z group rows — rendered as CSS grid (preview/print clone). */
  readZGroupLines?: ReadReportGroupLine[]
  bodyText: string
  footerLines: string[]
  footerFontSize: ReceiptBlockFontPx
  footerBold: boolean
  showCustomerAck: boolean
  /** When false, Phone No / Sign keep blank writing height without dotted guide lines. */
  customerAckWritingGuides?: boolean
  customerAckPhoneLabel?: string
  customerAckSignLabel?: string
  /** When false, omit the dashed rule before the acknowledgement block. */
  customerAckLeadingDivider?: boolean
  /** Refund-only — reason block rendered with natural wrap (not mono 30ch body). */
  refundReason?: string | null
  /** Proportional label-value rows after reason (e.g. REFUND AMOUNT). */
  summaryRows?: Array<{ label: string; value: string }>
  /** When true, render summaryRows after mono body (collector ticket). */
  summaryAfterBody?: boolean
  /** Label + horizontal dotted guide on one row; blank writing area below. */
  customerAckInlineGuides?: boolean
  /** Label row, one full-width dotted guide, then blank writing area (refund ticket). */
  customerAckStackedGuides?: boolean
  /** Full-width dotted line after Sign blank area (paper cut guide). */
  customerAckCutLine?: boolean
  /** Dashed separator immediately before paper cut (refund ticket). */
  customerAckCutSeparator?: boolean
  /** Blank line before Phone No (after footer). */
  customerAckLeadingBlank?: boolean
  /** Match horizontal inset of receipt-setup-body content. */
  customerAckBodyIndent?: boolean
  /** Extra blank space below Sign (refund ticket bottom margin). */
  customerAckTrailingSpace?: boolean
  /** Repair ticket photo filenames — rendered as wrapping grid rows (preview + print). */
  repairPhotoFileNames?: string[]
}
