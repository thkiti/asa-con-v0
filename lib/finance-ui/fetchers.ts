import {
  buildApiFilter,
  type ReconciliationDashboardFilter,
} from "./reconciliation"
import {
  buildIssuesQuery,
  type ReconciliationIssuesFilter,
} from "./reconciliation-issues"
import type {
  FinanceFilterValues,
  InventoryReconciliationResult,
  ReconciliationIssuesResult,
  ReconciliationSnapshotDetail,
  ReconciliationSnapshotHeader,
  SalesReconciliationResult,
  VoucherDetailResult,
} from "./types"
import type { SnapshotCaptureBody } from "./reconciliation-snapshots"

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

export type ReconciliationDashboardResult = {
  inventory: InventoryReconciliationResult
  sales: SalesReconciliationResult
}

export function fetchReconciliationDashboard(
  filter: ReconciliationDashboardFilter
): Promise<ReconciliationDashboardResult> {
  const apiFilter = buildApiFilter(filter)
  return Promise.all([
    fetchInventoryReconciliation(apiFilter),
    fetchSalesReconciliation(apiFilter),
  ]).then(([inventory, sales]) => ({ inventory, sales }))
}

export function fetchReconciliationIssues(
  filter: ReconciliationIssuesFilter
): Promise<ReconciliationIssuesResult> {
  const query = buildIssuesQuery(filter)
  return fetch(`/api/finance/reconciliation/issues${query}`).then(async (res) => {
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
    return res.json() as Promise<ReconciliationIssuesResult>
  })
}

export type ReconciliationSnapshotsListFilter = {
  branchId?: string
  limit?: number
}

export type ReconciliationSnapshotsListResult = {
  snapshots: ReconciliationSnapshotHeader[]
}

export type ReconciliationSnapshotDetailResult = {
  snapshot: ReconciliationSnapshotDetail
}

export type ReconciliationSnapshotCreateResult = {
  snapshot: ReconciliationSnapshotDetail
}

function buildSnapshotsQuery(
  filter: ReconciliationSnapshotsListFilter
): string {
  const params = new URLSearchParams()
  if (filter.branchId?.trim()) {
    params.set("branchId", filter.branchId.trim())
  }
  if (filter.limit !== undefined && Number.isFinite(filter.limit)) {
    params.set("limit", String(filter.limit))
  }
  const query = params.toString()
  return query ? `?${query}` : ""
}

async function parseFinanceApiError(res: Response): Promise<string> {
  let message = res.statusText || "Request failed"
  try {
    const body = (await res.json()) as { error?: string; message?: string }
    if (body.error) message = body.error
    else if (body.message) message = body.message
  } catch {
    // keep statusText
  }
  return message
}

export function fetchReconciliationSnapshots(
  filter: ReconciliationSnapshotsListFilter = {}
): Promise<ReconciliationSnapshotsListResult> {
  const query = buildSnapshotsQuery(filter)
  return fetch(`/api/finance/reconciliation/snapshots${query}`).then(
    async (res) => {
      if (!res.ok) {
        throw new Error(await parseFinanceApiError(res))
      }
      return res.json() as Promise<ReconciliationSnapshotsListResult>
    }
  )
}

export function fetchReconciliationSnapshotById(
  id: string
): Promise<ReconciliationSnapshotDetailResult> {
  return fetch(`/api/finance/reconciliation/snapshots/${encodeURIComponent(id)}`).then(
    async (res) => {
      if (!res.ok) {
        throw new Error(await parseFinanceApiError(res))
      }
      return res.json() as Promise<ReconciliationSnapshotDetailResult>
    }
  )
}

export function createReconciliationSnapshot(
  body: SnapshotCaptureBody
): Promise<ReconciliationSnapshotCreateResult> {
  return fetch("/api/finance/reconciliation/snapshots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (res) => {
    if (!res.ok) {
      throw new Error(await parseFinanceApiError(res))
    }
    return res.json() as Promise<ReconciliationSnapshotCreateResult>
  })
}

export function fetchVoucherById(id: string): Promise<VoucherDetailResult> {
  return fetch(`/api/finance/vouchers/${encodeURIComponent(id)}`).then(async (res) => {
    if (!res.ok) {
      throw new Error(await parseFinanceApiError(res))
    }
    return res.json() as Promise<VoucherDetailResult>
  })
}
