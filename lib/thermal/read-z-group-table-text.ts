import type { ReadReportGroupLine } from "@/lib/pos/aggregatePosReadReport"
import {
  READ_Z_GROUP_TABLE_HEADER_LABEL,
  formatReadZGroupDisplayLeft,
} from "./read-z-group-display"
import {
  THERMAL_AMOUNT_COL_WIDTH,
  THERMAL_COLUMNS,
  formatThermalMoney2,
  repeatThermalChar,
} from "./format"

const READ_Z_QTY_COL_WIDTH = 3
const READ_Z_QTY_AMOUNT_GAP = 2
const READ_Z_NAME_TO_QTY_GAP = 4

function formatRowQty(q: number): string {
  if (Number.isInteger(q)) return String(q)
  return q.toFixed(2)
}

/** Right-aligned Qty + Amount with clear separation from the name column. */
function formatReadZGroupTableLine(
  left: string,
  qty: number | "Qty",
  amount: number | "Amount",
  width = THERMAL_COLUMNS
): string {
  const qtyText =
    qty === "Qty"
      ? "Qty".padStart(READ_Z_QTY_COL_WIDTH, " ")
      : formatRowQty(qty).padStart(READ_Z_QTY_COL_WIDTH, " ")
  const amountText =
    amount === "Amount"
      ? "Amount".padStart(THERMAL_AMOUNT_COL_WIDTH, " ")
      : formatThermalMoney2(amount).padStart(THERMAL_AMOUNT_COL_WIDTH, " ")
  const rightPart = `${qtyText}${" ".repeat(READ_Z_QTY_AMOUNT_GAP)}${amountText}`
  const maxLeft = Math.max(0, width - rightPart.length - READ_Z_NAME_TO_QTY_GAP)
  const leftPart =
    left.length > maxLeft ? `${left.slice(0, Math.max(0, maxLeft - 1))}…` : left
  const gap = width - leftPart.length - rightPart.length
  return `${leftPart}${" ".repeat(Math.max(READ_Z_NAME_TO_QTY_GAP, gap))}${rightPart}`
}

export function buildReadZGroupTableText(
  groupLines: ReadReportGroupLine[],
  width = THERMAL_COLUMNS
): string {
  const lines: string[] = []

  lines.push(formatReadZGroupTableLine(READ_Z_GROUP_TABLE_HEADER_LABEL, "Qty", "Amount", width))
  lines.push(repeatThermalChar("-", width))

  for (const row of groupLines) {
    lines.push(
      formatReadZGroupTableLine(
        formatReadZGroupDisplayLeft(row.displayLeft),
        row.qty,
        row.amount,
        width
      )
    )
  }

  return lines.join("\n")
}
