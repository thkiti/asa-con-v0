import type { HistoricalPostingCsvRow, HistoricalPostingPlan } from "./types"

const CSV_HEADERS = [
  "Branch",
  "ReceiptNo",
  "SaleDate",
  "Gross",
  "CalculatedNet",
  "CalculatedVAT",
  "COGS",
  "Tender",
  "Status",
  "SkipReason",
] as const

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function historicalPostingCsvFilename(plan: HistoricalPostingPlan): string {
  const monthKey = plan.range.fromDateKey.slice(0, 7)
  return `historical-pos-posting-plan-${monthKey}.csv`
}

export function buildHistoricalPostingCsvContent(
  rows: HistoricalPostingCsvRow[]
): string {
  const lines = [CSV_HEADERS.join(",")]
  for (const row of rows) {
    lines.push(
      [
        row.branchCode,
        row.receiptNo,
        row.saleDate,
        row.gross,
        row.calculatedNet,
        row.calculatedVat,
        row.cogs,
        row.tender,
        row.status,
        row.skipReason,
      ]
        .map((value) => escapeCsvField(value))
        .join(",")
    )
  }
  return `${lines.join("\n")}\n`
}
