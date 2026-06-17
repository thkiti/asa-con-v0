import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { rowsToCsvTable } from "./csv"
import { formatAccountDisplay } from "./format-account"
import type { TrialBalanceResult, TrialBalanceRow } from "./types"

export type TrialBalanceFilter = {
  legalEntityCode?: DocumentEntityCode
  periodKey?: string
  from?: string
  to?: string
  hideZeroBalances?: boolean
}

function buildQuery(filter: TrialBalanceFilter): string {
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

export async function fetchTrialBalance(
  filter: TrialBalanceFilter
): Promise<TrialBalanceResult> {
  const res = await fetch(`/api/finance/reports/trial-balance${buildQuery(filter)}`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<TrialBalanceResult>
}

export function trialBalanceToCsv(result: TrialBalanceResult): string {
  const headers = ["Account", "Account Type", "Debit", "Credit", "Balance"] as const

  const bodyRows = result.rows.map((row: TrialBalanceRow) => [
    formatAccountDisplay(row.accountCode, row.accountName),
    row.accountType,
    row.totalDebit,
    row.totalCredit,
    row.signedBalance,
  ])

  const table = rowsToCsvTable(headers, bodyRows)
  const footer = ["TOTAL", "", result.totalDebits, result.totalCredits, result.difference]
    .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
    .join(",")

  const status = result.isBalanced ? "Balanced" : "Out of Balance"
  return `${table}\n${footer}\n"","","Status","","${status}"`
}

export function downloadTrialBalanceCsv(
  result: TrialBalanceResult,
  filename = "trial-balance.csv"
): void {
  const csv = trialBalanceToCsv(result)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
