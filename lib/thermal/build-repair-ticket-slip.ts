import { REPAIR_PICKUP_WARN_DAYS } from "@/lib/pos-ui/repair-ticket-storage"
import type { ResolvedThermalLayout } from "./types"
import {
  THERMAL_COLUMNS,
  appendThermalFooterLines,
  appendThermalHeaderLines,
  repeatThermalChar,
} from "./format"

export type RepairTicketSlipInput = {
  ticketNo: string
  branchName: string
  issuedAt: string
  fileNames: string[]
}

export function buildRepairTicketSlipText(
  input: RepairTicketSlipInput,
  layout: ResolvedThermalLayout
): string {
  const w = THERMAL_COLUMNS
  const lines: string[] = []

  appendThermalHeaderLines(lines, layout, w)
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
  lines.push(repeatThermalChar("-", w))
  lines.push("Warning: bring this ticket".slice(0, w))
  lines.push(`within ${REPAIR_PICKUP_WARN_DAYS} days`.slice(0, w))
  appendThermalFooterLines(lines, layout, w)
  lines.push("")
  return lines.join("\n")
}
