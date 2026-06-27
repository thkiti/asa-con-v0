import type { ResolvedThermalLayout } from "./types"
import {
  THERMAL_COLUMNS,
  formatThermalDateTime,
  wrapThermalTextLines,
} from "./format"
import { appendRepairTicketPhotoLines } from "./repair-ticket-photo-lines"
import { buildTicketLayout } from "./build-ticket-layout"
import { serializeTicketLayoutToText } from "./serialize-ticket-layout-text"
import type { ThermalSlipInfoBlockRow } from "./thermal-slip-info-block"

export type RepairTicketSlipInput = {
  ticketNo: string
  branchName: string
  issuedAt: string
  fileNames: string[]
  customerName?: string | null
  customerPhone?: string | null
  repairDescription?: string | null
  pickupNote?: string | null
}

export function buildRepairTicketSlipInfoBlock(
  input: RepairTicketSlipInput
): ThermalSlipInfoBlockRow[] {
  const rows: ThermalSlipInfoBlockRow[] = [
    { kind: "label-value", label: "Ticket No:", value: input.ticketNo },
    {
      kind: "label-value",
      label: "Repair:",
      value: formatThermalDateTime(input.issuedAt),
    },
  ]

  const customerName = input.customerName?.trim()
  if (customerName) {
    rows.push({ kind: "label-value", label: "Customer:", value: customerName })
  }

  const customerPhone = input.customerPhone?.trim()
  if (customerPhone) {
    rows.push({ kind: "label-value", label: "Phone:", value: customerPhone })
  }

  rows.push({ kind: "blank" })
  return rows
}

/** Slip body only — header/footer/identity are layout blocks. */
export function buildRepairTicketSlipBodyText(
  input: RepairTicketSlipInput,
  options?: { omitPhotoList?: boolean }
): string {
  const w = THERMAL_COLUMNS
  const lines: string[] = []

  const description = input.repairDescription?.trim()
  if (description) {
    lines.push(...wrapThermalTextLines(description, w))
    lines.push("")
  }

  const pickupNote = input.pickupNote?.trim()
  if (pickupNote) {
    lines.push(...wrapThermalTextLines(pickupNote, w))
    lines.push("")
  }

  if (!options?.omitPhotoList && input.fileNames.length > 0) {
    appendRepairTicketPhotoLines(lines, input.fileNames, w)
  }

  return lines.join("\n").trimEnd()
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
