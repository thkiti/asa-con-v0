import { rowsToCsvTable } from "./csv"
import type { ChangesInEquityResult } from "./types"

export type ChangesInEquityFilter = {
  branchId: string
  periodKey?: string
  from?: string
  to?: string
}

function buildQuery(filter: ChangesInEquityFilter): string {
  const params = new URLSearchParams()
  params.set("branchId", filter.branchId.trim())
  if (filter.periodKey?.trim()) params.set("periodKey", filter.periodKey.trim())
  if (filter.from?.trim()) params.set("from", filter.from.trim())
  if (filter.to?.trim()) params.set("to", filter.to.trim())
  return `?${params.toString()}`
}

async function parseError(res: Response): Promise<string> {
  let message = res.statusText || "Request failed"
  try {
    const body = (await res.json()) as { error?: string; code?: string }
    if (body.error) {
      message = body.code ? `${body.error} (${body.code})` : body.error
    }
  } catch {
    // keep statusText
  }
  return message
}

export async function fetchChangesInEquity(
  filter: ChangesInEquityFilter
): Promise<ChangesInEquityResult> {
  const res = await fetch(`/api/finance/reports/changes-in-equity${buildQuery(filter)}`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<ChangesInEquityResult>
}

export function changesInEquityToCsv(result: ChangesInEquityResult): string {
  const accountHeaders = result.columns.map(
    (column) => `${column.accountCode} ${column.accountName}`
  )
  const headers = ["Row", ...accountHeaders, "Total"] as const
  const bodyRows = result.rows.map((row) => [
    row.label,
    ...result.columns.map((column) => row.amounts[column.accountCode] ?? "0"),
    row.total,
  ])

  const table = rowsToCsvTable(headers, bodyRows)
  const profitSource =
    result.profitSource === "CLOSING_ENTRY"
      ? "Closing entry (posted)"
      : "Profit and loss (preview)"
  const reconStatus = result.reconciliation.isBalanced ? "Balanced" : "Not balanced"
  const warningSummary =
    result.warnings.length === 0
      ? "None"
      : result.warnings.map((warning) => warning.code).join("; ")

  return `${table}
"","","Profit for period","${result.profitForPeriod}"
"","","Profit source","${profitSource}"
"","","Reconciliation","${reconStatus}"
"","","Warnings","${warningSummary}"`
}

export function downloadChangesInEquityCsv(
  result: ChangesInEquityResult,
  filename = "changes-in-equity.csv"
): void {
  const csv = changesInEquityToCsv(result)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
