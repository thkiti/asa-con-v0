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
  /** Admin / POS preview — white paper frame matching Receipt Setup. */
  framed?: boolean
  identityContext?: {
    branchPhone?: string | null
    companyTaxId?: string | null
    machineTaxId?: string | null
  }
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
  framed = false,
  identityContext,
}: PosRepairTicketSlipProps) {
  const ticketLayout = buildTicketLayout({
    documentType: "REPAIR_TICKET",
    ticket: { ticketNo, branchName, issuedAt, fileNames },
    layout,
    branchCode,
    staffId,
    staffName,
    identityContext,
  })

  return (
    <ThermalPrintSource kind="repair-ticket">
      <ThermalTicketSlipView layout={ticketLayout} framed={framed} />
    </ThermalPrintSource>
  )
}
