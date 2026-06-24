"use client"

import { ThermalTicketSlipView } from "@/components/thermal/ThermalTicketSlipView"
import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import { buildTicketLayout } from "@/lib/thermal/build-ticket-layout"

type PosRefundReceiptSlipProps = {
  receipt: RefundReceiptPrintContext
}

export function PosRefundReceiptSlip({ receipt }: PosRefundReceiptSlipProps) {
  const layout = buildTicketLayout({
    documentType: "REFUND",
    refund: receipt,
    layout: receipt.thermalLayout,
  })

  return <ThermalTicketSlipView layout={layout} />
}
