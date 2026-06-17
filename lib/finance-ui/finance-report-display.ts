import { formatFinanceDocumentDate } from "./finance-document-display"

export const FINANCE_REPORT_TITLES = {
  trialBalance: "TRIAL BALANCE",
  balanceSheet: "BALANCE SHEET",
  profitLoss: "PROFIT & LOSS",
  generalLedger: "GENERAL LEDGER",
} as const

export type FinanceReportPeriodInput = {
  periodKey?: string | null
  from?: string | null
  to?: string | null
}

function formatPeriodKeyRange(periodKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(periodKey.trim())
  if (!match) return `Period ${periodKey}`
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return `Period ${periodKey}`
  const lastDay = new Date(year, month, 0).getDate()
  const from = `${match[1]}-${match[2]}-01`
  const to = `${match[1]}-${match[2]}-${String(lastDay).padStart(2, "0")}`
  return `${formatFinanceDocumentDate(from)} – ${formatFinanceDocumentDate(to)}`
}

/** Period or date-range label for sticky finance report context. */
export function formatFinanceReportPeriodLabel(input: FinanceReportPeriodInput): string {
  const periodKey = input.periodKey?.trim()
  if (periodKey) {
    return formatPeriodKeyRange(periodKey)
  }
  const from = input.from?.trim()
  const to = input.to?.trim()
  if (from && to) {
    return `${formatFinanceDocumentDate(from)} – ${formatFinanceDocumentDate(to)}`
  }
  return "—"
}

export function formatFinanceReportContextTitle(
  entityLabel: string,
  reportTitle: string
): string {
  return `${entityLabel} • ${reportTitle}`
}
