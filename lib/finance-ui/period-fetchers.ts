import type { CloseReadinessApiResult } from "./close-readiness"
import type {
  AccountingPeriodMutationResult,
  PeriodListResult,
  SessionDisplay,
} from "./types"
import type { PeriodAction } from "./types"

export type { PeriodAction }

type PeriodListFilter = {
  branchId?: string
  periodKey?: string
  status?: string
}

function buildPeriodQuery(filter?: PeriodListFilter): string {
  const params = new URLSearchParams()
  if (filter?.branchId?.trim()) {
    params.set("branchId", filter.branchId.trim())
  }
  if (filter?.periodKey?.trim()) {
    params.set("periodKey", filter.periodKey.trim())
  }
  const status = filter?.status?.trim()
  if (status && status !== "ALL") {
    params.set("status", status)
  }
  const query = params.toString()
  return query ? `?${query}` : ""
}

async function throwFetchError(res: Response): Promise<never> {
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

export function fetchSessionDisplay(): Promise<SessionDisplay | null> {
  return fetch("/api/auth/session").then(async (res) => {
    if (!res.ok) return null
    const body = (await res.json()) as {
      user?: { name?: string; role?: string } | null
    }
    const user = body.user
    if (!user) return null
    return {
      name: user.name ?? "",
      role: user.role ?? "",
    }
  })
}

export function fetchAccountingPeriods(
  filter?: PeriodListFilter
): Promise<PeriodListResult> {
  const query = buildPeriodQuery(filter)
  return fetch(`/api/finance/periods${query}`).then(async (res) => {
    if (!res.ok) await throwFetchError(res)
    return res.json() as Promise<PeriodListResult>
  })
}

export function postAccountingPeriod(body: {
  branchId: string
  periodKey: string
}): Promise<AccountingPeriodMutationResult> {
  return fetch("/api/finance/periods", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (res) => {
    if (!res.ok) await throwFetchError(res)
    return res.json() as Promise<AccountingPeriodMutationResult>
  })
}

export function patchAccountingPeriod(body: {
  branchId: string
  periodKey: string
  action: PeriodAction
}): Promise<AccountingPeriodMutationResult> {
  return fetch("/api/finance/periods", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (res) => {
    if (!res.ok) await throwFetchError(res)
    return res.json() as Promise<AccountingPeriodMutationResult>
  })
}

export function fetchCloseReadiness(periodId: string): Promise<CloseReadinessApiResult> {
  const trimmed = periodId.trim()
  return fetch(`/api/finance/periods/${encodeURIComponent(trimmed)}/close-readiness`).then(
    async (res) => {
      if (!res.ok) await throwFetchError(res)
      return res.json() as Promise<CloseReadinessApiResult>
    }
  )
}