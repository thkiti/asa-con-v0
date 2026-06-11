import { netIncomeLabel } from "./profit-loss"
import { rowsToCsvTable } from "./csv"
import type { BalanceSheetRow, RetainedEarningsResult } from "./types"

export type RetainedEarningsFilter = {
  branchId: string
  periodKey?: string
  from?: string
  to?: string
}

function buildQuery(filter: RetainedEarningsFilter): string {
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

export async function fetchRetainedEarnings(
  filter: RetainedEarningsFilter
): Promise<RetainedEarningsResult> {
  const res = await fetch(`/api/finance/reports/retained-earnings${buildQuery(filter)}`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<RetainedEarningsResult>
}

function accountRows(label: string, rows: BalanceSheetRow[]): string[][] {
  if (rows.length === 0) {
    return [[`${label}`, "", "", "0"]]
  }
  return rows.map((row) => [label, row.accountCode, row.accountName, row.amount])
}

export function retainedEarningsToCsv(result: RetainedEarningsResult): string {
  const headers = ["Section", "Account Code", "Account Name", "Amount"] as const
  const incomeLabel = netIncomeLabel(result.currentNetIncome)
  const bodyRows = [
    ...accountRows("Retained Earnings (301)", result.retainedEarningsAccounts),
    ["Retained Earnings (301)", "", "Posted Retained Earnings", result.postedRetainedEarnings],
    ...accountRows("Other Equity", result.otherEquityAccounts),
    ["Other Equity", "", "Other Equity Total", result.otherEquityTotal],
    ["Equity", "", "Posted Total Equity", result.postedTotalEquity],
    ["P&L", "", `Current Net ${incomeLabel}`, result.currentNetIncome],
    ["Bridge", "", "Adjusted Retained Earnings", result.adjustedRetainedEarnings],
    ["Bridge", "", "Adjusted Total Equity", result.adjustedTotalEquity],
    ["Reconciliation", "", "Balance Sheet Difference", result.balanceSheetDifference],
    ["Reconciliation", "", "Unclosed Earnings Gap", result.unclosedEarningsGap],
  ]

  const table = rowsToCsvTable(headers, bodyRows)
  const status = result.isEconomicallyBalanced ? "Economically Balanced" : "Not Economically Balanced"
  return `${table}\n"","","Status","${status}"`
}

export function downloadRetainedEarningsCsv(
  result: RetainedEarningsResult,
  filename = "retained-earnings.csv"
): void {
  const csv = retainedEarningsToCsv(result)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
