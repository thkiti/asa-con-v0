"use client"

import { ThermalPrintSource, ThermalSlipPre } from "@/components/thermal/ThermalSlipPre"
import {
  buildCollectorSlipText,
  COLLECTOR_SIGNATURE_LINES,
} from "@/lib/thermal/build-collector-slip"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import type { ResolvedThermalLayout } from "@/lib/thermal/types"

type PosCollectorTicketSlipProps = {
  report: ReadReportPayload
  layout: ResolvedThermalLayout
}

export function PosCollectorTicketSlip({ report, layout }: PosCollectorTicketSlipProps) {
  const slipText = buildCollectorSlipText(report, layout)
  const signatureText = COLLECTOR_SIGNATURE_LINES.join("\n")

  return (
    <ThermalPrintSource kind="collector">
      <ThermalSlipPre text={slipText} ariaLabel="Collector ticket" />
      <div
        data-testid="collector-ticket-signature-space"
        className="thermal-signature-space collector-ticket-signature-space"
        aria-hidden="true"
      />
      <ThermalSlipPre text={signatureText} ariaLabel="Collector signature" />
    </ThermalPrintSource>
  )
}
