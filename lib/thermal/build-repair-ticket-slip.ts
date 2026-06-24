import type { ResolvedThermalLayout } from "./types"
import {
  THERMAL_COLUMNS,
  appendThermalFooterLines,
  appendThermalHeaderLines,
  repeatThermalChar,
} from "./format"
import { buildTicketLayout } from "./build-ticket-layout"
import { serializeTicketLayoutToText } from "./serialize-ticket-layout-text"

export type RepairTicketSlipInput = {
  ticketNo: string
  branchName: string
  issuedAt: string
  fileNames: string[]
}

/** Slip body only — header/footer are layout blocks. */
export function buildRepairTicketSlipBodyText(input: RepairTicketSlipInput): string {
  const w = THERMAL_COLUMNS
  const lines: string[] = []

  const branchLine = input.branchName.trim().slice(0, w)
  if (branchLine) lines.push(branchLine)
  lines.push(repeatThermalChar("-", w))
  lines.push(input.ticketNo.slice(0, w))
  lines.push(
    new Date(input.issuedAt).toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
    }).slice(0, w)
  )
  lines.push(repeatThermalChar("-", w))
  lines.push(`Photos (${input.fileNames.length})`.slice(0, w))
  for (let i = 0; i < input.fileNames.length; i++) {
    const prefix = `${i + 1}. `
    const name = input.fileNames[i]
    const maxName = w - prefix.length
    lines.push(`${prefix}${name.length > maxName ? name.slice(0, maxName) : name}`)
  }

  return lines.join("\n")
}

export function buildRepairTicketSlipText(
  input: RepairTicketSlipInput,
  layout: ResolvedThermalLayout,
  options?: {
    branchCode?: string
    staffId?: string
    staffName?: string
  }
): string {
  return serializeTicketLayoutToText(
    buildTicketLayout({
      documentType: "REPAIR_TICKET",
      ticket: input,
      layout,
      branchCode: options?.branchCode ?? "",
      staffId: options?.staffId,
      staffName: options?.staffName,
    })
  )
}
