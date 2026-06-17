import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { rowsToCsvTable } from "./csv"
import { formatAccountDisplay } from "./format-account"
import type { BalanceSheetResult, BalanceSheetRow } from "./types"

export type BalanceSheetFilter = {
  legalEntityCode?: DocumentEntityCode
  periodKey?: string
  from?: string
  to?: string
  hideZeroBalances?: boolean
}

function buildQuery(filter: BalanceSheetFilter): string {
  const params = new URLSearchParams()
  if (filter.periodKey?.trim()) params.set("periodKey", filter.periodKey.trim())
  if (filter.from?.trim()) params.set("from", filter.from.trim())
  if (filter.to?.trim()) params.set("to", filter.to.trim())
  if (filter.hideZeroBalances) params.set("hideZeroBalances", "true")
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

export async function fetchBalanceSheet(
  filter: BalanceSheetFilter
): Promise<BalanceSheetResult> {
  const res = await fetch(`/api/finance/reports/balance-sheet${buildQuery(filter)}`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<BalanceSheetResult>
}

function sectionRows(label: string, rows: BalanceSheetRow[]): string[][] {
  if (rows.length === 0) {
    return [[`${label}`, "", "0"]]
  }
  return rows.map((row) => [
    label,
    formatAccountDisplay(row.accountCode, row.accountName),
    row.amount,
  ])
}

export function balanceSheetToCsv(result: BalanceSheetResult): string {
  const headers = ["Section", "Account", "Amount"] as const
  const bodyRows = [
    ...sectionRows("Assets", result.assets),
    ["Assets", "TOTAL", result.totalAssets],
    ...sectionRows("Liabilities", result.liabilities),
    ["Liabilities", "TOTAL", result.totalLiabilities],
    ...sectionRows("Equity", result.equity),
    ["Equity", "TOTAL", result.totalEquity],
    ["", "Liabilities + Equity", result.totalLiabilitiesAndEquity],
    ["", "Difference (Assets - L+E)", result.balanceDifference],
  ]

  const table = rowsToCsvTable(headers, bodyRows)
  const status = result.isBalanced ? "Balanced" : "Out of Balance"
  return `${table}\n"","","Status","${status}"`
}

export function downloadBalanceSheetCsv(
  result: BalanceSheetResult,
  filename = "balance-sheet.csv"
): void {
  const csv = balanceSheetToCsv(result)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
