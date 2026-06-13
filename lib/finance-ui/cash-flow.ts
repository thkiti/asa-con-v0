import { rowsToCsvTable } from "./csv"
import type { CashFlowResult } from "./types"

export type CashFlowFilter = {
  branchId: string
  periodKey?: string
  from?: string
  to?: string
}

function buildQuery(filter: CashFlowFilter): string {
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

export async function fetchCashFlow(filter: CashFlowFilter): Promise<CashFlowResult> {
  const res = await fetch(`/api/finance/reports/cash-flow${buildQuery(filter)}`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<CashFlowResult>
}

function sectionToRows(
  sectionTitle: string,
  section: CashFlowResult["sections"]["operating"]
): (string | null)[][] {
  const rows: (string | null)[][] = section.lines.map((line) => [
    sectionTitle,
    line.label,
    line.amount,
    line.source,
    line.accountCode ?? "",
  ])
  rows.push([sectionTitle, "Subtotal", section.subtotal, "", ""])
  return rows
}

export function cashFlowToCsv(result: CashFlowResult): string {
  const headers = ["Section", "Line", "Amount", "Source", "Account Code"] as const
  const rows: (string | null)[][] = [
    ["Summary", "Net income", result.netIncome, "PROFIT_LOSS", ""],
    ["Summary", "Net change in cash", result.netChangeInCash, "", ""],
    [
      "Reconciliation",
      "Opening cash and equivalents",
      result.cashReconciliation.openingCashAndEquivalents,
      "",
      "",
    ],
    [
      "Reconciliation",
      "Closing cash and equivalents",
      result.cashReconciliation.closingCashAndEquivalents,
      "",
      "",
    ],
    ["Reconciliation", "GL change", result.cashReconciliation.glChange, "", ""],
    [
      "Reconciliation",
      "Computed change",
      result.cashReconciliation.computedChange,
      "",
      "",
    ],
    ["Reconciliation", "Difference", result.cashReconciliation.difference, "", ""],
    ...sectionToRows("Operating", result.sections.operating),
    ...sectionToRows("Investing", result.sections.investing),
    ...sectionToRows("Financing", result.sections.financing),
  ]

  const warningRows = result.warnings.map((warning) => [
    "Warning",
    warning.code,
    warning.message,
    "",
    "",
  ])

  return rowsToCsvTable(headers, [...rows, ...warningRows])
}

export function downloadCashFlowCsv(
  result: CashFlowResult,
  filename = "cash-flow.csv"
): void {
  const csv = cashFlowToCsv(result)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
