import type { PeriodReconciliationStatus } from "@/generated/prisma/client"
import type { CashReconciliationRow } from "@/lib/finance/cash-reconciliation"

export const CASH_RECONCILIATION_PATH = "/finance/reconciliation/cash"

export type CashReconciliationListResponse = {
  items: CashReconciliationRow[]
  total: number
}

export type CashReconciliationDetailResponse = {
  item: CashReconciliationRow
}

export type CashReconciliationListQuery = {
  periodKey?: string
  branchId?: string
  glAccountId?: string
  status?: PeriodReconciliationStatus
}

function buildQuery(params: CashReconciliationListQuery): string {
  const search = new URLSearchParams()
  if (params.periodKey?.trim()) search.set("periodKey", params.periodKey.trim())
  if (params.branchId?.trim()) search.set("branchId", params.branchId.trim())
  if (params.glAccountId?.trim()) search.set("glAccountId", params.glAccountId.trim())
  if (params.status) search.set("status", params.status)
  const query = search.toString()
  return query ? `?${query}` : ""
}

export function buildCashReconciliationPath(
  query: CashReconciliationListQuery = {}
): string {
  return `${CASH_RECONCILIATION_PATH}${buildQuery(query)}`
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

export async function fetchCashReconciliationList(
  query: CashReconciliationListQuery = {}
): Promise<CashReconciliationListResponse> {
  const res = await fetch(`/api/finance/cash-reconciliation${buildQuery(query)}`, {
    cache: "no-store",
  })
  return parseJson(res)
}

export async function fetchCashReconciliationById(
  id: string
): Promise<CashReconciliationDetailResponse> {
  const res = await fetch(`/api/finance/cash-reconciliation/${encodeURIComponent(id)}`, {
    cache: "no-store",
  })
  return parseJson(res)
}

export async function saveCashReconciliationDraft(
  input: Record<string, unknown>
): Promise<CashReconciliationDetailResponse> {
  const res = await fetch("/api/finance/cash-reconciliation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  return parseJson(res)
}

export async function patchCashReconciliation(
  id: string,
  input: Record<string, unknown>
): Promise<CashReconciliationDetailResponse> {
  const res = await fetch(`/api/finance/cash-reconciliation/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  return parseJson(res)
}

export { formatPeriodReconciliationStatusLabel } from "./bank-reconciliation"
