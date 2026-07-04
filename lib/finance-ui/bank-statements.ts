import type {
  BankStatementDetail,
  BankStatementLineInput,
  BankStatementRow,
  BankStatementStatus,
} from "@/lib/finance/bank-statement"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { financeScopedFetch } from "./finance-entity-scope"

export const BANK_STATEMENTS_PATH = "/api/finance/bank-statements"
export const FINANCE_BANK_STATEMENTS_PAGE_PATH = "/finance/bank-statements"

export type BankStatementListResponse = {
  items: BankStatementRow[]
  total: number
}

export type BankStatementDetailResponse = {
  item: BankStatementDetail
}

function buildListQuery(input: {
  periodKey?: string
  bankAccountId?: string
  status?: BankStatementStatus | "all"
  search?: string
}): string {
  const params = new URLSearchParams()
  if (input.periodKey?.trim()) params.set("periodKey", input.periodKey.trim())
  if (input.bankAccountId?.trim()) params.set("bankAccountId", input.bankAccountId.trim())
  if (input.status && input.status !== "all") params.set("status", input.status)
  if (input.search?.trim()) params.set("search", input.search.trim())
  const query = params.toString()
  return query ? `?${query}` : ""
}

async function parseJson<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed (${res.status})`)
  }
  return body
}

export async function fetchBankStatements(
  legalEntityCode: DocumentEntityCode,
  filter: {
    periodKey?: string
    bankAccountId?: string
    status?: BankStatementStatus | "all"
    search?: string
  } = {}
): Promise<BankStatementListResponse> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BANK_STATEMENTS_PATH}${buildListQuery(filter)}`,
    { cache: "no-store" }
  )
  return parseJson(res)
}

export async function fetchBankStatement(
  legalEntityCode: DocumentEntityCode,
  id: string
): Promise<BankStatementDetailResponse> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BANK_STATEMENTS_PATH}/${encodeURIComponent(id)}`,
    { cache: "no-store" }
  )
  return parseJson(res)
}

export async function createBankStatement(
  legalEntityCode: DocumentEntityCode,
  input: Record<string, unknown>
): Promise<BankStatementDetailResponse> {
  const res = await financeScopedFetch(legalEntityCode, BANK_STATEMENTS_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  return parseJson(res)
}

export async function patchBankStatement(
  legalEntityCode: DocumentEntityCode,
  id: string,
  input: Record<string, unknown>
): Promise<BankStatementDetailResponse> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BANK_STATEMENTS_PATH}/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  )
  return parseJson(res)
}

export async function deleteBankStatement(
  legalEntityCode: DocumentEntityCode,
  id: string
): Promise<void> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BANK_STATEMENTS_PATH}/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  )
  await parseJson(res)
}

export function formatBankStatementAccountLabel(
  row: Pick<BankStatementRow, "bankAccount">
): string {
  const account = row.bankAccount
  return `${account.bankName} • ${account.accountNumber}`
}

export function bankStatementStatusTooltip(status: BankStatementStatus): string {
  switch (status) {
    case "NEW":
      return "New — not yet reviewed"
    case "DRAFT":
      return "Draft — in progress"
    case "READY":
      return "Ready — statement captured and validated"
    default:
      return status
  }
}

export type { BankStatementLineInput }
