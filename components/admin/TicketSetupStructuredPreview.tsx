"use client"

import type { ReactNode } from "react"
import type { ThermalTicketLayout } from "@/lib/thermal/ticket-layout-types"
import { ThermalTicketSlipView } from "@/components/thermal/ThermalTicketSlipView"

type TicketSetupStructuredPreviewProps = {
  layout: ThermalTicketLayout
  testId?: string
  bodyOverride?: ReactNode
  ackOverride?: ReactNode
}

export function TicketSetupStructuredPreview({
  layout,
  testId,
  bodyOverride,
  ackOverride,
}: TicketSetupStructuredPreviewProps) {
  return (
    <ThermalTicketSlipView
      layout={layout}
      framed
      testId={testId}
      bodyOverride={bodyOverride}
      ackOverride={ackOverride}
    />
  )
}
