import {
  THERMAL_COLUMNS,
  THERMAL_NAME_ELLIPSIS,
  centerThermalLine,
  truncateThermalText,
} from "./format"

export const RECEIPT_MACHINE_NO_LABEL = "M/C No."

/** Default identity row size (px) — machine row starts here before shrinking. */
export const RECEIPT_MACHINE_LINE_MAX_PX = 14

/** Minimum machine-row font size (px) before ellipsis truncation. */
export const RECEIPT_MACHINE_LINE_MIN_PX = 8

export function formatReceiptMachineLine(machineId: string): string {
  const value = machineId.trim()
  return `${RECEIPT_MACHINE_NO_LABEL} ${value}`
}

/** Monospace thermal slip — single centered row; truncate, never wrap. */
export function formatReceiptMachineLineForThermal(
  machineId: string,
  width = THERMAL_COLUMNS
): string {
  const line = formatReceiptMachineLine(machineId)
  const fitted =
    line.length <= width ? line : truncateThermalText(line, width, THERMAL_NAME_ELLIPSIS)
  return centerThermalLine(fitted, width)
}

export function truncateReceiptMachineLineDisplay(
  line: string,
  maxChars: number
): string {
  if (line.length <= maxChars) return line
  if (maxChars <= THERMAL_NAME_ELLIPSIS.length) {
    return line.slice(0, maxChars)
  }
  return line.slice(0, maxChars - THERMAL_NAME_ELLIPSIS.length) + THERMAL_NAME_ELLIPSIS
}
