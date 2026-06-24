"use client"

import { ThermalTicketSlipView } from "@/components/thermal/ThermalTicketSlipView"
import type { ReceiptPrintContext } from "@/lib/pos/receipt-print-context"
import { buildTicketLayout } from "@/lib/thermal/build-ticket-layout"

type PosSaleReceiptSlipProps = {
  receipt: ReceiptPrintContext
}

export function PosSaleReceiptSlip({ receipt }: PosSaleReceiptSlipProps) {
  const layout = buildTicketLayout({
    documentType: "RECEIPT",
    receipt,
    layout: receipt.thermalLayout,
  })

  return (
    <ThermalTicketSlipView layout={layout} ariaHiddenBlocks />
  )
}
