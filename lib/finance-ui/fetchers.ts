import type {
  FinanceFilterValues,
  InventoryReconciliationResult,
  SalesReconciliationResult,
} from "./types"

export function buildReconciliationQuery(filter: FinanceFilterValues): string {
  const params = new URLSearchParams()
  if (filter.branchId?.trim()) {
    params.set("branchId", filter.branchId.trim())
  }
  if (filter.from?.trim()) {
    params.set("from", filter.from.trim())
  }
  if (filter.to?.trim()) {
    params.set("to", filter.to.trim())
  }
  const query = params.toString()
  return query ? `?${query}` : ""
}

async function fetchReconciliation<T>(
  path: string,
  filter: FinanceFilterValues
): Promise<T> {
  const query = buildReconciliationQuery(filter)
  const res = await fetch(`${path}${query}`)
  if (!res.ok) {
    let message = res.statusText || "Request failed"
    try {
      const body = (await res.json()) as { error?: string; message?: string }
      if (body.error) message = body.error
      else if (body.message) message = body.message
    } catch {
      // keep statusText
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export function fetchInventoryReconciliation(
  filter: FinanceFilterValues
): Promise<InventoryReconciliationResult> {
  return fetchReconciliation<InventoryReconciliationResult>(
    "/api/finance/reconciliation/inventory",
    filter
  )
}

export function fetchSalesReconciliation(
  filter: FinanceFilterValues
): Promise<SalesReconciliationResult> {
  return fetchReconciliation<SalesReconciliationResult>(
    "/api/finance/reconciliation/sales",
    filter
  )
}
