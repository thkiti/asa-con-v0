import type {
  CloseEvidenceApiResult,
  CloseEvidenceHistoryApiResult,
} from "./close-evidence"
import type { ReopenEvidenceApiResult } from "./reopen-evidence"
import type {
  ReopenRequestAction,
  ReopenRequestApiResult,
  ReopenRequestsApiResult,
} from "./reopen-requests"
import type {
  PeriodAuditExportApiResult,
  PeriodAuditTimelineApiResult,
} from "./period-audit-timeline"
import type { CloseReadinessApiResult } from "./close-readiness"
import type {
  PeriodActionError,
  PeriodFetchErrorBody,
} from "./period-errors"
import type {
  AccountingPeriodMutationResult,
  PeriodListResult,
  SessionDisplay,
} from "./types"
import type { PeriodAction } from "./types"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { financeScopedFetch } from "./finance-entity-scope"

export type { PeriodAction }

type PeriodListFilter = {
  /** @deprecated Ignored by API — list is scoped to session legal entity */
  branchId?: string
  periodKey?: string
  status?: string
}

function buildPeriodQuery(filter?: PeriodListFilter): string {
  const params = new URLSearchParams()
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
  let body: PeriodFetchErrorBody = {}
  try {
    body = (await res.json()) as PeriodFetchErrorBody
    if (body.error) message = body.error
    else if (body.message) message = body.message
  } catch {
    // keep statusText
  }

  const err = new Error(message) as PeriodActionError
  if (body.code) err.code = body.code
  if (body.readinessStatus) err.readinessStatus = body.readinessStatus
  if (body.blockers) err.blockers = body.blockers
  throw err
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

/** Entity-scoped period list for finance period filter dropdowns. */
export function fetchAccountingPeriodsForEntity(
  legalEntityCode: DocumentEntityCode
): Promise<PeriodListResult> {
  return financeScopedFetch(legalEntityCode, "/api/finance/periods", {
    cache: "no-store",
  }).then(async (res) => {
    if (!res.ok) await throwFetchError(res)
    return res.json() as Promise<PeriodListResult>
  })
}

export function postAccountingPeriod(body: {
  periodKey: string
  /** @deprecated Ignored by API */
  branchId?: string
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
  periodKey: string
  action: PeriodAction
  reason?: string
  /** @deprecated Ignored by API */
  branchId?: string
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

export function fetchPeriodAuditTimeline(
  periodId: string
): Promise<PeriodAuditTimelineApiResult> {
  const trimmed = periodId.trim()
  return fetch(
    `/api/finance/periods/${encodeURIComponent(trimmed)}/timeline`
  ).then(async (res) => {
    if (!res.ok) await throwFetchError(res)
    return res.json() as Promise<PeriodAuditTimelineApiResult>
  })
}

export function fetchPeriodAuditExport(
  periodId: string
): Promise<PeriodAuditExportApiResult> {
  const trimmed = periodId.trim()
  return fetch(
    `/api/finance/periods/${encodeURIComponent(trimmed)}/audit-export`
  ).then(async (res) => {
    if (!res.ok) await throwFetchError(res)
    return res.json() as Promise<PeriodAuditExportApiResult>
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

export function fetchCloseEvidence(periodId: string): Promise<CloseEvidenceApiResult> {
  const trimmed = periodId.trim()
  return fetch(`/api/finance/periods/${encodeURIComponent(trimmed)}/close-evidence`).then(
    async (res) => {
      if (!res.ok) await throwFetchError(res)
      return res.json() as Promise<CloseEvidenceApiResult>
    }
  )
}

export function fetchCloseEvidenceById(
  periodId: string,
  evidenceId: string
): Promise<CloseEvidenceApiResult> {
  const trimmedPeriod = periodId.trim()
  const trimmedEvidence = evidenceId.trim()
  return fetch(
    `/api/finance/periods/${encodeURIComponent(trimmedPeriod)}/close-evidence/${encodeURIComponent(trimmedEvidence)}`
  ).then(async (res) => {
    if (!res.ok) await throwFetchError(res)
    return res.json() as Promise<CloseEvidenceApiResult>
  })
}

export function fetchCloseEvidenceHistory(
  periodId: string
): Promise<CloseEvidenceHistoryApiResult> {
  const trimmed = periodId.trim()
  return fetch(
    `/api/finance/periods/${encodeURIComponent(trimmed)}/close-evidence/history`
  ).then(async (res) => {
    if (!res.ok) await throwFetchError(res)
    return res.json() as Promise<CloseEvidenceHistoryApiResult>
  })
}

export function fetchReopenEvidence(periodId: string): Promise<ReopenEvidenceApiResult> {
  const trimmed = periodId.trim()
  return fetch(
    `/api/finance/periods/${encodeURIComponent(trimmed)}/reopen-evidence`
  ).then(async (res) => {
    if (!res.ok) await throwFetchError(res)
    return res.json() as Promise<ReopenEvidenceApiResult>
  })
}

export function fetchReopenRequests(
  periodId: string,
  filter?: { status?: string }
): Promise<ReopenRequestsApiResult> {
  const trimmed = periodId.trim()
  const params = new URLSearchParams()
  if (filter?.status?.trim()) {
    params.set("status", filter.status.trim())
  }
  const query = params.toString()
  const suffix = query ? `?${query}` : ""
  return fetch(
    `/api/finance/periods/${encodeURIComponent(trimmed)}/reopen-requests${suffix}`
  ).then(async (res) => {
    if (!res.ok) await throwFetchError(res)
    return res.json() as Promise<ReopenRequestsApiResult>
  })
}

export function postReopenRequest(input: {
  periodId: string
  reason: string
}): Promise<ReopenRequestApiResult> {
  return fetch(
    `/api/finance/periods/${encodeURIComponent(input.periodId.trim())}/reopen-requests`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: input.reason }),
    }
  ).then(async (res) => {
    if (!res.ok) await throwFetchError(res)
    return res.json() as Promise<ReopenRequestApiResult>
  })
}

export function patchReopenRequest(input: {
  periodId: string
  requestId: string
  action: ReopenRequestAction
  approvalNote?: string
  rejectionNote?: string
}): Promise<ReopenRequestApiResult> {
  return fetch(
    `/api/finance/periods/${encodeURIComponent(input.periodId.trim())}/reopen-requests/${encodeURIComponent(input.requestId.trim())}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: input.action,
        approvalNote: input.approvalNote,
        rejectionNote: input.rejectionNote,
      }),
    }
  ).then(async (res) => {
    if (!res.ok) await throwFetchError(res)
    return res.json() as Promise<ReopenRequestApiResult>
  })
}
