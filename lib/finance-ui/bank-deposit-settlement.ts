import type { BankDepositSettlementReconciliation } from "@/lib/finance/pos-settlement/bank-deposit-reconciliation"
import type { Role } from "@/lib/shared"
import { buildReconciliationQuery } from "./fetchers"
import type { FinanceFilterValues } from "./types"

export type {
  BankDepositSettlementReconciliation,
  BankDepositSettlementStatus,
} from "@/lib/finance/pos-settlement/bank-deposit-reconciliation"

export type BankDepositSettlementStatusListResult = {
  items: BankDepositSettlementReconciliation[]
}

export type BankDepositSettlementPostResult = {
  voucherId: string
  voucherNo: string
  collectNo: string
  collectorReportId: string
  amount: string
}

export class BankDepositSettlementApiError extends Error {
  readonly code: string
  readonly httpStatus: number

  constructor(message: string, code: string, httpStatus: number) {
    super(message)
    this.name = "BankDepositSettlementApiError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

export function canAccessBankDepositSettlementUi(role: Role): boolean {
  return role === "HO_FINANCE" || role === "HO_ADMIN"
}

async function parseApiError(res: Response): Promise<BankDepositSettlementApiError> {
  let message = res.statusText || "Request failed"
  let code = "INTERNAL_ERROR"
  try {
    const body = (await res.json()) as { error?: string; code?: string }
    if (body.error) message = body.error
    if (body.code) code = body.code
  } catch {
    // keep defaults
  }
  return new BankDepositSettlementApiError(message, code, res.status)
}

export function fetchBankDepositSettlementStatusList(
  filter: FinanceFilterValues
): Promise<BankDepositSettlementStatusListResult> {
  const query = buildReconciliationQuery(filter)
  return fetch(
    `/api/finance/pos-settlement/bank-deposit/status-list${query}`
  ).then(async (res) => {
    if (!res.ok) {
      throw await parseApiError(res)
    }
    return res.json() as Promise<BankDepositSettlementStatusListResult>
  })
}

export function postBankDepositSettlement(
  collectorReportId: string
): Promise<BankDepositSettlementPostResult> {
  return fetch("/api/finance/pos-settlement/bank-deposit/post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collectorReportId }),
  }).then(async (res) => {
    if (!res.ok) {
      throw await parseApiError(res)
    }
    return res.json() as Promise<BankDepositSettlementPostResult>
  })
}

export function formatBankDepositPostError(err: unknown): string {
  if (err instanceof BankDepositSettlementApiError) {
    if (err.code === "DUPLICATE_SOURCE") {
      return "Bank deposit already posted for this collector report."
    }
    if (err.code === "COLLECTOR_PICKUP_NOT_POSTED") {
      return "Collector pickup settlement must be posted before bank deposit."
    }
    if (err.code === "PAY_IN_SLIP_REQUIRED") {
      return "Upload the PAY-IN slip before posting bank deposit."
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
  return "Bank deposit settlement request failed"
}
