import type { ReconciliationAccountRef } from "@/lib/finance/period-reconciliation-accounts"

export type ReconciliationAccountListResult = {
  items: ReconciliationAccountRef[]
}

export type ReconciliationAccountRole = "BANK" | "CASH"

export async function fetchReconciliationAccounts(
  role: ReconciliationAccountRole
): Promise<ReconciliationAccountListResult> {
  const res = await fetch(
    `/api/finance/period-reconciliation/accounts?role=${encodeURIComponent(role)}`,
    { cache: "no-store" }
  )

  if (!res.ok) {
    let message = res.statusText || "Request failed"
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // keep default
    }
    throw new Error(message)
  }

  return res.json() as Promise<ReconciliationAccountListResult>
}
