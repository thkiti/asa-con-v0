"use client"

import type { ThermalTicketLayout } from "@/lib/thermal/ticket-layout-types"
import { ThermalTicketSlipView } from "@/components/thermal/ThermalTicketSlipView"

type RefundSetupPreviewProps = {
  layout: ThermalTicketLayout
}

export function RefundSetupPreview({ layout }: RefundSetupPreviewProps) {
  return (
    <ThermalTicketSlipView
      layout={layout}
      framed
      testId="refund-setup-preview"
      ackOverride={undefined}
    />
  )
}
