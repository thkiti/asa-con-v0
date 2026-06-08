"use client"

import { ThermalPrintSource, ThermalSlipPre } from "@/components/thermal/ThermalSlipPre"
import { buildReadZSlipText } from "@/lib/thermal/build-read-z-slip"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import type { ResolvedThermalLayout } from "@/lib/thermal/types"

type PosReadZSlipProps = {
  report: ReadReportPayload
  layout: ResolvedThermalLayout
}

export function PosReadZSlip({ report, layout }: PosReadZSlipProps) {
  const slipText = buildReadZSlipText(report, layout)

  return (
    <ThermalPrintSource kind="read-z">
      <ThermalSlipPre text={slipText} ariaLabel="READ Z report" />
    </ThermalPrintSource>
  )
}
