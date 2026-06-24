import type { ReceiptBlockFontPx } from "./receipt-block-font-size"
import type { ReceiptSlipRefStaff } from "./build-receipt-slip"

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
  subHeaderLines: string[]
  subHeaderFontSize: ReceiptBlockFontPx
  subHeaderBold: boolean
  bodyText: string
  footerLines: string[]
  footerFontSize: ReceiptBlockFontPx
  footerBold: boolean
  showCustomerAck: boolean
}
