import {
  emptyQuickStatementLine,
  type QuickStatementLine,
} from "@/lib/finance-ui/bank-cash-workspace"

export type QuickAmountField = "deposit" | "withdrawal"

export type EnterToAddLineResult = {
  lines: QuickStatementLine[]
  focusLineKey: string
  focusField: QuickAmountField
}

export function insertBlankQuickLineAfter(
  lines: QuickStatementLine[],
  afterKey: string
): { lines: QuickStatementLine[]; newLineKey: string } {
  const index = lines.findIndex((line) => line.key === afterKey)
  const newLine = emptyQuickStatementLine()
  const next = [...lines]
  next.splice(index >= 0 ? index + 1 : next.length, 0, newLine)
  return { lines: next, newLineKey: newLine.key }
}

export function applyEnterToAddLine(
  lines: QuickStatementLine[],
  lineKey: string,
  field: QuickAmountField,
  amount: string
): EnterToAddLineResult | null {
  const trimmed = amount.trim()
  if (!trimmed) return null
  if (!lines.some((entry) => entry.key === lineKey)) return null

  const { lines: nextLines, newLineKey } = insertBlankQuickLineAfter(lines, lineKey)
  return {
    lines: nextLines,
    focusLineKey: newLineKey,
    focusField: field,
  }
}

export function removeQuickLine(lines: QuickStatementLine[], key: string): QuickStatementLine[] {
  const next = lines.filter((line) => line.key !== key)
  if (next.length === 0) return [emptyQuickStatementLine()]
  return next
}

export function updateQuickLineAmount(
  line: QuickStatementLine,
  field: QuickAmountField,
  value: string
): QuickStatementLine {
  if (field === "deposit") {
    return {
      ...line,
      depositAmount: value,
      withdrawalAmount: value.trim() ? "" : line.withdrawalAmount,
    }
  }
  return {
    ...line,
    withdrawalAmount: value,
    depositAmount: value.trim() ? "" : line.depositAmount,
  }
}
