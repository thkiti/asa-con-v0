"use client"

import { ThermalPrintSource } from "@/components/thermal/ThermalSlipPre"
import { ThermalTicketSlipView } from "@/components/thermal/ThermalTicketSlipView"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import { buildTicketLayout } from "@/lib/thermal/build-ticket-layout"
import type { ResolvedThermalLayout } from "@/lib/thermal/types"

type PosCollectorTicketSlipProps = {
  report: ReadReportPayload
  layout: ResolvedThermalLayout
}

export function PosCollectorTicketSlip({ report, layout }: PosCollectorTicketSlipProps) {
  const ticketLayout = buildTicketLayout({
    documentType: "COLLECTOR",
    report,
    layout,
  })

  return (
    <ThermalPrintSource kind="collector">
      <ThermalTicketSlipView layout={ticketLayout} />
    </ThermalPrintSource>
  )
}
