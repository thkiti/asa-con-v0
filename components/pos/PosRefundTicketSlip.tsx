"use client"

import { ThermalPrintSource } from "@/components/thermal/ThermalSlipPre"
import { ThermalTicketSlipView } from "@/components/thermal/ThermalTicketSlipView"
import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import { POS_REFUND_RECEIPT_PRINT_SOURCE } from "@/lib/pos-ui/pos-thermal-ticket-print"
import { buildTicketLayout } from "@/lib/thermal/build-ticket-layout"

type PosRefundTicketSlipProps = {
  receipt: RefundReceiptPrintContext
  /** Admin / POS preview — white paper frame matching Receipt Setup. */
  framed?: boolean
}

export function PosRefundTicketSlip({ receipt, framed = false }: PosRefundTicketSlipProps) {
  const ticketLayout = buildTicketLayout({
    documentType: "REFUND",
    refund: receipt,
    layout: receipt.thermalLayout,
  })

  return (
    <ThermalPrintSource kind={POS_REFUND_RECEIPT_PRINT_SOURCE}>
      <ThermalTicketSlipView layout={ticketLayout} framed={framed} />
    </ThermalPrintSource>
  )
}
