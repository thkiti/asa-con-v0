import type { CollectorPickupSettlementReconciliation } from "@/lib/finance/pos-settlement/collector-pickup-reconciliation"
import type { Role } from "@/lib/shared"
import {
  defaultCollectorPickupSettlementPeriodKey,
  toCollectorPickupFinanceFilter,
  type CollectorPickupSettlementUiFilter,
} from "./collector-pickup-settlement-list-filter"
import { buildReconciliationQuery } from "./fetchers"
import type { FinanceFilterValues } from "./types"

export const COLLECTOR_PICKUP_SETTLEMENT_PATH =
  "/finance/pos-settlement/collector-pickup"

function derivePeriodKeyFromDateRange(from: string, to: string): string | null {
  const match = /^(\d{4})-(\d{2})-01$/.exec(from)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const lastDay = new Date(year, month, 0).getDate()
  const expectedTo = `${match[1]}-${match[2]}-${String(lastDay).padStart(2, "0")}`
  if (to !== expectedTo) return null
  return `${match[1]}-${match[2]}`
}

/** Parse settlement UI filter from page search params. */
export function parseCollectorPickupSettlementUiFilterFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">
): CollectorPickupSettlementUiFilter | null {
  const periodKey = searchParams.get("period")?.trim()
  const dateFrom = searchParams.get("dateFrom")?.trim() ?? ""
  const dateTo = searchParams.get("dateTo")?.trim() ?? ""
  const branchId = searchParams.get("branchId")?.trim() ?? ""

  if (periodKey) {
    return { branchId, periodKey, dateFrom, dateTo }
  }

  const from = searchParams.get("from")?.trim()
  const to = searchParams.get("to")?.trim()
  if (!from || !to) return null

  const derivedPeriod = derivePeriodKeyFromDateRange(from, to)
  return {
    branchId,
    periodKey: derivedPeriod ?? defaultCollectorPickupSettlementPeriodKey(),
    dateFrom: derivedPeriod ? "" : from,
    dateTo: derivedPeriod ? "" : to,
  }
}

/** @deprecated Use parseCollectorPickupSettlementUiFilterFromSearchParams */
export function parseCollectorPickupSettlementFilterFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">
): FinanceFilterValues | null {
  const ui = parseCollectorPickupSettlementUiFilterFromSearchParams(searchParams)
  if (!ui) return null
  return toCollectorPickupFinanceFilter(ui)
}

/** returnTo target for voucher drill-down — preserves branch/period/date filters. */
export function buildCollectorPickupSettlementReturnPath(
  filter: CollectorPickupSettlementUiFilter | FinanceFilterValues
): string {
  const params = new URLSearchParams()

  if ("periodKey" in filter) {
    const ui = filter as CollectorPickupSettlementUiFilter
    if (ui.branchId.trim()) params.set("branchId", ui.branchId.trim())
    if (ui.periodKey.trim()) params.set("period", ui.periodKey.trim())
    if (ui.dateFrom.trim()) params.set("dateFrom", ui.dateFrom.trim())
    if (ui.dateTo.trim()) params.set("dateTo", ui.dateTo.trim())
  } else {
    const legacy = filter as FinanceFilterValues
    if (legacy.branchId?.trim()) params.set("branchId", legacy.branchId.trim())
    if (legacy.from?.trim()) params.set("from", legacy.from.trim())
    if (legacy.to?.trim()) params.set("to", legacy.to.trim())
  }

  const query = params.toString()
  return query
    ? `${COLLECTOR_PICKUP_SETTLEMENT_PATH}?${query}`
    : COLLECTOR_PICKUP_SETTLEMENT_PATH
}

export type {
  CollectorPickupSettlementReconciliation,
  CollectorPickupSettlementStatus,
} from "@/lib/finance/pos-settlement/collector-pickup-reconciliation"

export type CollectorPickupSettlementStatusListResult = {
  items: CollectorPickupSettlementReconciliation[]
}

export type CollectorPickupSettlementPostResult = {
  voucherId: string
  voucherNo: string
  collectNo: string
  collectorReportId: string
  amount: string
}

export class CollectorPickupSettlementApiError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus: number) {
    super(message)
    this.name = "CollectorPickupSettlementApiError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

export function canAccessCollectorPickupSettlementUi(role: Role): boolean {
  return role === "HO_FINANCE" || role === "HO_ADMIN"
}

async function parseApiError(res: Response): Promise<CollectorPickupSettlementApiError> {
  let message = res.statusText || "Request failed"
  let code = "INTERNAL_ERROR"
  try {
    const body = (await res.json()) as { error?: string; code?: string }
    if (body.error) message = body.error
    if (body.code) code = body.code
  } catch {
    // keep defaults
  }
  return new CollectorPickupSettlementApiError(message, code, res.status)
}

export function fetchCollectorPickupSettlementStatusList(
  filter: FinanceFilterValues
): Promise<CollectorPickupSettlementStatusListResult> {
  const query = buildReconciliationQuery(filter)
  return fetch(
    `/api/finance/pos-settlement/collector-pickup/status-list${query}`
  ).then(async (res) => {
    if (!res.ok) {
      throw await parseApiError(res)
    }
    return res.json() as Promise<CollectorPickupSettlementStatusListResult>
  })
}

export function postCollectorPickupSettlement(
  collectorReportId: string
): Promise<CollectorPickupSettlementPostResult> {
  return fetch("/api/finance/pos-settlement/collector-pickup/post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collectorReportId }),
  }).then(async (res) => {
    if (!res.ok) {
      throw await parseApiError(res)
    }
    return res.json() as Promise<CollectorPickupSettlementPostResult>
  })
}

export function formatCollectorPickupPostError(err: unknown): string {
  if (err instanceof CollectorPickupSettlementApiError) {
    if (err.code === "DUPLICATE_SOURCE") {
      return "Settlement already posted for this collector report."
    }
    if (err.code === "PERIOD_CLOSED" || err.code === "PERIOD_NOT_OPENED") {
      return "Accounting period is closed — cannot post settlement."
    }
    if (err.code === "FORBIDDEN_LEGAL_ENTITY") {
      return "POS settlement is available for AS / ASAS sessions only."
    }
    return err.message
  }
  if (err instanceof Error) return err.message
  return "Collector pickup settlement request failed"
}
