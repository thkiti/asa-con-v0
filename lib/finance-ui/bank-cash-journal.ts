import type { BankCashJournalResult } from "@/lib/finance/bank-cash-journal"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { financeScopedFetch } from "./finance-entity-scope"

export const BANK_CASH_JOURNAL_PATH = "/finance/bank-cash"
export const BANK_CASH_JOURNAL_API = "/api/finance/bank-cash-journal"

export type BankCashJournalQuery = {
  periodKey: string
  bankAccountId: string
  branchId?: string
}

export type BankCashJournalResponse = {
  journal: BankCashJournalResult
}

function buildQuery(query: BankCashJournalQuery): string {
  const params = new URLSearchParams()
  params.set("periodKey", query.periodKey.trim())
  params.set("bankAccountId", query.bankAccountId.trim())
  if (query.branchId?.trim()) {
    params.set("branchId", query.branchId.trim())
  }
  return `?${params.toString()}`
}

export function buildBankCashJournalPath(
  legalEntityCode: DocumentEntityCode,
  query: Partial<BankCashJournalQuery> = {}
): string {
  const params = new URLSearchParams()
  params.set("legalEntityCode", legalEntityCode)
  if (query.periodKey?.trim()) params.set("periodKey", query.periodKey.trim())
  if (query.bankAccountId?.trim()) params.set("bankAccountId", query.bankAccountId.trim())
  if (query.branchId?.trim()) params.set("branchId", query.branchId.trim())
  return `${BANK_CASH_JOURNAL_PATH}?${params.toString()}`
}

export async function fetchBankCashJournal(
  legalEntityCode: DocumentEntityCode,
  query: BankCashJournalQuery
): Promise<BankCashJournalResponse> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BANK_CASH_JOURNAL_API}${buildQuery(query)}`,
    { cache: "no-store" }
  )
  const body = (await res.json()) as BankCashJournalResponse & { error?: string }
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed (${res.status})`)
  }
  return body
}
