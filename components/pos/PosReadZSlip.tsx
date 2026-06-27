"use client"

import { ThermalPrintSource } from "@/components/thermal/ThermalSlipPre"
import { ThermalTicketSlipView } from "@/components/thermal/ThermalTicketSlipView"
import { buildTicketLayout } from "@/lib/thermal/build-ticket-layout"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import type { ResolvedThermalLayout } from "@/lib/thermal/types"

type PosReadZSlipProps = {
  report: ReadReportPayload
  layout: ResolvedThermalLayout
  /** Admin / POS preview — white paper frame matching Receipt Setup. */
  framed?: boolean
}

export function PosReadZSlip({ report, layout, framed = false }: PosReadZSlipProps) {
  const ticketLayout = buildTicketLayout({
    documentType: "READ_Z",
    report,
    layout,
  })

  return (
    <ThermalPrintSource kind="read-z">
      <ThermalTicketSlipView layout={ticketLayout} framed={framed} />
    </ThermalPrintSource>
  )
}
