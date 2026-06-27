"use client"

import { ThermalTicketSlipView } from "@/components/thermal/ThermalTicketSlipView"
import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import { buildTicketLayout } from "@/lib/thermal/build-ticket-layout"

type PosRefundReceiptSlipProps = {
  receipt: RefundReceiptPrintContext
  /** 80mm framed slip — required for POS print tab (preview = print). */
  framed?: boolean
}

export function PosRefundReceiptSlip({ receipt, framed = false }: PosRefundReceiptSlipProps) {
  const layout = buildTicketLayout({
    documentType: "REFUND",
    refund: receipt,
    layout: receipt.thermalLayout,
  })

  return <ThermalTicketSlipView layout={layout} framed={framed} />
}
