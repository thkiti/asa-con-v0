import { rowsToCsvTable } from "./csv"
import { formatAccountDisplay } from "./format-account"
import type { GeneralLedgerResult } from "./types"

export type GeneralLedgerFilter = {
  branchId?: string
  periodKey?: string
  from?: string
  to?: string
  accountId?: string
  accountIds?: string[]
  accountCode?: string
  accountCodes?: string[]
}

function buildQuery(filter: GeneralLedgerFilter): string {
  const params = new URLSearchParams()
  if (filter.branchId?.trim()) params.set("branchId", filter.branchId.trim())
  if (filter.periodKey?.trim()) params.set("periodKey", filter.periodKey.trim())
  if (filter.from?.trim()) params.set("from", filter.from.trim())
  if (filter.to?.trim()) params.set("to", filter.to.trim())
  if (filter.accountId?.trim()) params.set("accountId", filter.accountId.trim())
  for (const id of filter.accountIds ?? []) {
    if (id.trim()) params.append("accountIds", id.trim())
  }
  if (filter.accountCode?.trim()) params.set("accountCode", filter.accountCode.trim())
  for (const code of filter.accountCodes ?? []) {
    if (code.trim()) params.append("accountCodes", code.trim())
  }
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

export async function fetchGeneralLedger(
  filter: GeneralLedgerFilter
): Promise<GeneralLedgerResult> {
  const res = await fetch(`/api/finance/reports/general-ledger${buildQuery(filter)}`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<GeneralLedgerResult>
}

export function generalLedgerToCsv(result: GeneralLedgerResult): string {
  const headers = [
    "Account",
    "Date",
    "Entry No",
    "Source Ref",
    "Description",
    "Debit",
    "Credit",
    "Signed Movement",
    "Running Balance",
  ] as const

  const rows: (string | null)[][] = []
  for (const account of result.accounts) {
    const accountLabel = formatAccountDisplay(account.accountCode, account.accountName)
    rows.push([
      accountLabel,
      "",
      "",
      "",
      "Opening Balance",
      account.openingDebit,
      account.openingCredit,
      "",
      account.openingBalance,
    ])
    for (const tx of account.transactions) {
      rows.push([
        accountLabel,
        tx.journalDate.slice(0, 10),
        tx.entryNo,
        tx.sourceRef,
        tx.description ?? tx.lineMemo ?? "",
        tx.debit,
        tx.credit,
        tx.signedMovement,
        tx.runningBalance,
      ])
    }
    rows.push([
      accountLabel,
      "",
      "",
      "",
      "Closing Balance",
      "",
      "",
      "",
      account.closingBalance,
    ])
  }

  return rowsToCsvTable(headers, rows)
}

export function downloadGeneralLedgerCsv(
  result: GeneralLedgerResult,
  filename = "general-ledger.csv"
): void {
  const csv = generalLedgerToCsv(result)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
