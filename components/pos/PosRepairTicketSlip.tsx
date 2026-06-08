"use client"

import { ThermalPrintSource, ThermalSlipPre } from "@/components/thermal/ThermalSlipPre"
import { buildRepairTicketSlipText } from "@/lib/thermal/build-repair-ticket-slip"
import type { ResolvedThermalLayout } from "@/lib/thermal/types"

type PosRepairTicketSlipProps = {
  ticketNo: string
  branchName: string
  issuedAt: string
  fileNames: string[]
  layout: ResolvedThermalLayout
}

export function PosRepairTicketSlip({
  ticketNo,
  branchName,
  issuedAt,
  fileNames,
  layout,
}: PosRepairTicketSlipProps) {
  const slipText = buildRepairTicketSlipText(
    { ticketNo, branchName, issuedAt, fileNames },
    layout
  )

  return (
    <ThermalPrintSource kind="repair-ticket">
      <ThermalSlipPre text={slipText} ariaLabel="Repair ticket" />
    </ThermalPrintSource>
  )
}
