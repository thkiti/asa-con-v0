import { repeatThermalChar, THERMAL_COLUMNS } from "./format"

/** Dotted writing lines under Phone No (~2× legacy single-line area). */
export const THERMAL_ACK_PHONE_WRITING_LINES = 2

/** Dotted writing lines under Sign (~3× legacy single-line area). */
export const THERMAL_ACK_SIGN_WRITING_LINES = 3

export function appendThermalCustomerAcknowledgement(
  lines: string[],
  width: number = THERMAL_COLUMNS
): void {
  lines.push(repeatThermalChar("-", width))
  lines.push("")
  lines.push("Phone No")
  lines.push("")
  for (let i = 0; i < THERMAL_ACK_PHONE_WRITING_LINES; i += 1) {
    lines.push(repeatThermalChar(".", width))
  }
  lines.push("")
  lines.push("Sign")
  lines.push("")
  for (let i = 0; i < THERMAL_ACK_SIGN_WRITING_LINES; i += 1) {
    lines.push(repeatThermalChar(".", width))
  }
}

export function buildThermalCustomerAcknowledgementText(
  width: number = THERMAL_COLUMNS
): string {
  const lines: string[] = []
  appendThermalCustomerAcknowledgement(lines, width)
  return lines.join("\n")
}
