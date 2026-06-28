import type { CollectorPickupSettlementReconciliation } from "@/lib/finance/pos-settlement/collector-pickup-reconciliation"
import type { Role } from "@/lib/shared"
import { buildReconciliationQuery } from "./fetchers"
import type { FinanceFilterValues } from "./types"

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
