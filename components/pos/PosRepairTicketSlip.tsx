"use client"

import { ThermalPrintSource } from "@/components/thermal/ThermalSlipPre"
import { ThermalTicketSlipView } from "@/components/thermal/ThermalTicketSlipView"
import { buildTicketLayout } from "@/lib/thermal/build-ticket-layout"
import type { ResolvedThermalLayout } from "@/lib/thermal/types"

type PosRepairTicketSlipProps = {
  ticketNo: string
  branchCode: string
  branchName: string
  issuedAt: string
  fileNames: string[]
  layout: ResolvedThermalLayout
  staffId?: string
  staffName?: string
}

export function PosRepairTicketSlip({
  ticketNo,
  branchCode,
  branchName,
  issuedAt,
  fileNames,
  layout,
  staffId,
  staffName,
}: PosRepairTicketSlipProps) {
  const ticketLayout = buildTicketLayout({
    documentType: "REPAIR_TICKET",
    ticket: { ticketNo, branchName, issuedAt, fileNames },
    layout,
    branchCode,
    staffId,
    staffName,
  })

  return (
    <ThermalPrintSource kind="repair-ticket">
      <ThermalTicketSlipView layout={ticketLayout} />
    </ThermalPrintSource>
  )
}
