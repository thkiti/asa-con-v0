"use client"

import type { ThermalTicketLayout } from "@/lib/thermal/ticket-layout-types"
import { ThermalTicketSlipView } from "@/components/thermal/ThermalTicketSlipView"

type ReceiptSetupPreviewProps = {
  layout: ThermalTicketLayout
}

export function ReceiptSetupPreview({ layout }: ReceiptSetupPreviewProps) {
  return (
    <ThermalTicketSlipView
      layout={layout}
      framed
      testId="receipt-setup-preview"
    />
  )
}
