import type { BankCashCheckReconciliationEvidence } from "@/lib/finance/bank-cash-check"

export type BankCashCheckReconciliationEvidenceQuery = {
  periodKey: string
  glAccountId?: string
  glAccountCode?: string
}

export type BankCashCheckReconciliationEvidenceResponse = {
  evidence: BankCashCheckReconciliationEvidence
}

function buildQuery(params: BankCashCheckReconciliationEvidenceQuery): string {
  const search = new URLSearchParams()
  search.set("periodKey", params.periodKey.trim())
  if (params.glAccountId?.trim()) search.set("glAccountId", params.glAccountId.trim())
  if (params.glAccountCode?.trim()) search.set("glAccountCode", params.glAccountCode.trim())
  return `?${search.toString()}`
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

export async function fetchBankCashCheckReconciliationEvidence(
  query: BankCashCheckReconciliationEvidenceQuery
): Promise<BankCashCheckReconciliationEvidenceResponse> {
  const res = await fetch(
    `/api/finance/bank-cash-check/reconciliation-evidence${buildQuery(query)}`,
    { cache: "no-store" }
  )
  return parseJson(res)
}

export function formatBankCashCheckReconciliationStatusLabel(
  status: BankCashCheckReconciliationEvidence["status"]
): string {
  switch (status) {
    case "NOT_STARTED":
      return "Not started"
    case "IN_PROGRESS":
      return "In progress"
    case "COMPLETE":
      return "Complete"
    case "VARIANCE":
      return "Variance"
    default:
      return status
  }
}
