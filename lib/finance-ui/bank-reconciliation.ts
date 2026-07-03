import type { PeriodReconciliationStatus } from "@/generated/prisma/client"
import type { BankReconciliationRow } from "@/lib/finance/bank-reconciliation"

export const BANK_RECONCILIATION_PATH = "/finance/reconciliation/bank"

export type BankReconciliationListResponse = {
  items: BankReconciliationRow[]
  total: number
}

export type BankReconciliationDetailResponse = {
  item: BankReconciliationRow
}

export type BankReconciliationListQuery = {
  periodKey?: string
  branchId?: string
  glAccountId?: string
  status?: PeriodReconciliationStatus
}

function buildQuery(params: BankReconciliationListQuery): string {
  const search = new URLSearchParams()
  if (params.periodKey?.trim()) search.set("periodKey", params.periodKey.trim())
  if (params.branchId?.trim()) search.set("branchId", params.branchId.trim())
  if (params.glAccountId?.trim()) search.set("glAccountId", params.glAccountId.trim())
  if (params.status) search.set("status", params.status)
  const query = search.toString()
  return query ? `?${query}` : ""
}

export function buildBankReconciliationPath(
  query: BankReconciliationListQuery = {}
): string {
  return `${BANK_RECONCILIATION_PATH}${buildQuery(query)}`
}

async function parseJson<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & { error?: string }
  if (!res.ok) {
    throw new Error(
      typeof body === "object" && body && "error" in body && body.error
        ? body.error
        : `Request failed (${res.status})`
    )
  }
  return body
}

export async function fetchBankReconciliationList(
  query: BankReconciliationListQuery = {}
): Promise<BankReconciliationListResponse> {
  const res = await fetch(`/api/finance/bank-reconciliation${buildQuery(query)}`, {
    cache: "no-store",
  })
  return parseJson(res)
}

export async function fetchBankReconciliationById(
  id: string
): Promise<BankReconciliationDetailResponse> {
  const res = await fetch(`/api/finance/bank-reconciliation/${encodeURIComponent(id)}`, {
    cache: "no-store",
  })
  return parseJson(res)
}

export async function saveBankReconciliationDraft(
  input: Record<string, unknown>
): Promise<BankReconciliationDetailResponse> {
  const res = await fetch("/api/finance/bank-reconciliation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  return parseJson(res)
}

export async function patchBankReconciliation(
  id: string,
  input: Record<string, unknown>
): Promise<BankReconciliationDetailResponse> {
  const res = await fetch(`/api/finance/bank-reconciliation/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  return parseJson(res)
}

export function formatPeriodReconciliationStatusLabel(
  status: PeriodReconciliationStatus
): string {
  switch (status) {
    case "DRAFT":
      return "Draft"
    case "SUBMITTED":
      return "Submitted"
    case "CONFIRMED":
      return "Confirmed"
    case "LOCKED":
      return "Locked"
    default:
      return status
  }
}
