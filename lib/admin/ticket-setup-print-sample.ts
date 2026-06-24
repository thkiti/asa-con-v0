import type { ThermalDocumentLayoutView } from "@/lib/thermal/types"
import {
  THERMAL_COLUMNS,
  appendThermalCenteredIfPresent,
} from "@/lib/thermal/format"
import { appendThermalCustomerAcknowledgement } from "@/lib/thermal/thermal-customer-ack"
import {
  resolveFooterBlockLines,
  resolveHeaderBlockLines,
} from "@/lib/thermal/receipt-layout-blocks"

/** Admin print sample — block-aware header/footer + unchanged body text. */
export function buildBlockAwareThermalSlipText(
  layout: ThermalDocumentLayoutView,
  bodyText: string,
  options?: { includeCustomerAck?: boolean }
): string {
  const w = THERMAL_COLUMNS
  const out: string[] = []

  for (const line of resolveHeaderBlockLines(layout)) {
    appendThermalCenteredIfPresent(out, line, w)
  }

  const body = bodyText.trim()
  if (body) {
    if (out.length > 0) out.push("")
    out.push(body)
  }

  const footerLines = resolveFooterBlockLines(layout)
  if (footerLines.length > 0) {
    if (out.length > 0) out.push("")
    for (const line of footerLines) {
      appendThermalCenteredIfPresent(out, line, w)
    }
  }

  if (options?.includeCustomerAck) {
    appendThermalCustomerAcknowledgement(out, w)
  }

  out.push("")
  return out.join("\n")
}
