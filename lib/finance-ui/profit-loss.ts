import { rowsToCsvTable } from "./csv"
import type { ProfitLossResult } from "./types"

export type ProfitLossFilter = {
  branchId: string
  periodKey?: string
  from?: string
  to?: string
}

function buildQuery(filter: ProfitLossFilter): string {
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

export async function fetchProfitLoss(
  filter: ProfitLossFilter
): Promise<ProfitLossResult> {
  const res = await fetch(`/api/finance/reports/profit-loss${buildQuery(filter)}`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<ProfitLossResult>
}

export function profitLossToCsv(result: ProfitLossResult): string {
  const headers = ["Section", "Account Code", "Account Name", "Amount"] as const
  const rows: (string | null)[][] = []

  for (const row of result.revenue) {
    rows.push(["Revenue", row.accountCode, row.accountName, row.amount])
  }
  rows.push(["Revenue", "", "Total Revenue", result.totalRevenue])

  for (const row of result.expenses) {
    rows.push(["Expense", row.accountCode, row.accountName, row.amount])
  }
  rows.push(["Expense", "", "Total Expense", result.totalExpense])
  rows.push(["Summary", "", "Net Income", result.netIncome])

  return rowsToCsvTable(headers, rows)
}

export function downloadProfitLossCsv(
  result: ProfitLossResult,
  filename = "profit-loss.csv"
): void {
  const csv = profitLossToCsv(result)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function netIncomeLabel(netIncome: string): "Profit" | "Loss" | "Break Even" {
  const value = Number(netIncome)
  if (Number.isNaN(value) || value === 0) return "Break Even"
  return value > 0 ? "Profit" : "Loss"
}
