import type { BankAccountRow, BankAccountActiveFilter } from "@/lib/finance/bank-account"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { financeScopedFetch } from "./finance-entity-scope"

export const BANK_ACCOUNTS_PATH = "/api/finance/bank-accounts"
export const FINANCE_BANK_ACCOUNTS_PAGE_PATH = "/finance/bank-accounts"

export type BankAccountListResponse = {
  items: BankAccountRow[]
  total: number
}

export type BankAccountDetailResponse = {
  item: BankAccountRow
}

function buildListQuery(activeFilter: BankAccountActiveFilter): string {
  if (activeFilter === "all") return "?status=all"
  if (activeFilter === "inactive") return "?status=inactive"
  return ""
}

async function parseJson<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed (${res.status})`)
  }
  return body
}

export async function fetchBankAccounts(
  legalEntityCode: DocumentEntityCode,
  activeFilter: BankAccountActiveFilter = "active"
): Promise<BankAccountListResponse> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BANK_ACCOUNTS_PATH}${buildListQuery(activeFilter)}`,
    { cache: "no-store" }
  )
  return parseJson(res)
}

export async function createBankAccount(
  legalEntityCode: DocumentEntityCode,
  input: Record<string, unknown>
): Promise<BankAccountDetailResponse> {
  const res = await financeScopedFetch(legalEntityCode, BANK_ACCOUNTS_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  return parseJson(res)
}

export async function patchBankAccount(
  legalEntityCode: DocumentEntityCode,
  id: string,
  input: Record<string, unknown>
): Promise<BankAccountDetailResponse> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BANK_ACCOUNTS_PATH}/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  )
  return parseJson(res)
}

export async function deactivateBankAccount(
  legalEntityCode: DocumentEntityCode,
  id: string
): Promise<BankAccountDetailResponse> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BANK_ACCOUNTS_PATH}/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  )
  return parseJson(res)
}

export function formatBankAccountLabel(account: BankAccountRow): string {
  return `${account.bankName} • ${account.accountNumber} • ${account.accountName}`
}

export function formatBankAccountGlLabel(account: BankAccountRow): string {
  return `${account.glAccount.code} • ${account.glAccount.name}`
}

export function formatBankAccountPickerLabel(account: BankAccountRow): string {
  return `${account.glAccount.code} • ${account.bankName} • ${account.accountNumber}`
}
