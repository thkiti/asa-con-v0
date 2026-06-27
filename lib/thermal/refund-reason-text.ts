import { THERMAL_COLUMNS } from "./format"

export const REFUND_REASON_LABEL = "REASON:"
const REFUND_REASON_PREFIX = `${REFUND_REASON_LABEL} `

/** Plain-text refund reason — single line when possible; hanging indent on wrap. */
export function appendRefundReasonPlainText(
  lines: string[],
  reason: string | null | undefined,
  width: number = THERMAL_COLUMNS
): void {
  const text = reason?.trim() ?? ""
  if (!text) {
    lines.push(REFUND_REASON_LABEL)
    return
  }

  const inline = `${REFUND_REASON_PREFIX}${text}`
  if (inline.length <= width) {
    lines.push(inline)
    return
  }

  const firstBudget = Math.max(0, width - REFUND_REASON_PREFIX.length)
  lines.push(REFUND_REASON_PREFIX + text.slice(0, firstBudget))
  let rest = text.slice(firstBudget)
  const indent = " ".repeat(REFUND_REASON_PREFIX.length)
  while (rest.length > 0) {
    const chunkBudget = Math.max(1, width - indent.length)
    const chunk = rest.slice(0, chunkBudget)
    lines.push(indent + chunk)
    rest = rest.slice(chunk.length)
  }
}
