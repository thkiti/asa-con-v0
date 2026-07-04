import type {
  ManualJournalEntryListFilter,
  ManualJournalEntryListResult,
  ManualJournalEntryRead,
  ManualJournalEntryListItem,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-read-types"
import type { ManualJournalSaveLineInput } from "@/lib/finance/manual-journal-entry/manual-journal-entry-types"
import {
  appendFinanceLegalEntityToApiUrl,
  financeScopedFetch,
} from "@/lib/finance-ui/finance-entity-scope"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"

export type {
  ManualJournalEntryListFilter,
  ManualJournalEntryListItem,
  ManualJournalEntryRead,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-read-types"

export type ManualJournalEntryListFilterInput = Omit<
  ManualJournalEntryListFilter,
  "dateFrom" | "dateTo"
> & {
  dateFrom?: string
  dateTo?: string
  entryNo?: string
  postingState?: "posted" | "unposted"
}

export type CreateManualJournalEntryDraftPayload = {
  branchId: string
  legalEntityCode: string
  entryDate: string
  entryType: string
  description?: string | null
  refNo?: string | null
  lines: ManualJournalSaveLineInput[]
}

export type UpdateManualJournalEntryDraftPayload = {
  entryDate?: string
  description?: string | null
  refNo?: string | null
  lines: ManualJournalSaveLineInput[]
}

export type CancelManualJournalEntryPayload = {
  cancelReason?: string | null
}

async function parseError(res: Response): Promise<string> {
  let message = res.statusText || "Request failed"
  try {
    const body = (await res.json()) as { error?: string; code?: string }
    if (body.error) {
      message = body.code ? `${body.error} (${body.code})` : body.error
    }
  } catch {
    // keep statusText
  }
  return message
}

function buildListQuery(filter: ManualJournalEntryListFilterInput = {}): string {
  const params = new URLSearchParams()
  if (filter.legalEntityCode?.trim()) {
    params.set("legalEntityCode", filter.legalEntityCode.trim())
  }
  if (filter.status) params.set("status", filter.status)
  if (filter.entryType) params.set("entryType", filter.entryType)
  if (filter.entryNo?.trim()) params.set("entryNo", filter.entryNo.trim())
  if (filter.postingState) params.set("postingState", filter.postingState)
  if (filter.branchId?.trim()) params.set("branchId", filter.branchId.trim())
  if (filter.dateFrom?.trim()) params.set("dateFrom", filter.dateFrom.trim())
  if (filter.dateTo?.trim()) params.set("dateTo", filter.dateTo.trim())
  if (filter.limit != null) params.set("limit", String(filter.limit))
  if (filter.offset != null) params.set("offset", String(filter.offset))
  const q = params.toString()
  return q ? `?${q}` : ""
}

const BASE = "/api/finance/manual-journal-entries"

export async function fetchManualJournalEntries(
  legalEntityCode: DocumentEntityCode,
  filter: ManualJournalEntryListFilterInput = {}
): Promise<ManualJournalEntryListResult> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BASE}${buildListQuery({ ...filter, legalEntityCode })}`
  )
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<ManualJournalEntryListResult>
}

export async function fetchManualJournalEntry(
  legalEntityCode: DocumentEntityCode,
  entryId: string
): Promise<ManualJournalEntryRead> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BASE}/${encodeURIComponent(entryId)}`
  )
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: ManualJournalEntryRead }
  return body.entry
}

export async function createManualJournalEntryDraft(
  legalEntityCode: DocumentEntityCode,
  payload: CreateManualJournalEntryDraftPayload
): Promise<ManualJournalEntryRead> {
  const res = await financeScopedFetch(legalEntityCode, BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: ManualJournalEntryRead }
  return body.entry
}

export async function updateManualJournalEntryDraft(
  legalEntityCode: DocumentEntityCode,
  entryId: string,
  payload: UpdateManualJournalEntryDraftPayload
): Promise<ManualJournalEntryRead> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BASE}/${encodeURIComponent(entryId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  )
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: ManualJournalEntryRead }
  return body.entry
}

export async function deleteDraftManualJournalEntry(
  legalEntityCode: DocumentEntityCode,
  entryId: string
): Promise<void> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BASE}/${encodeURIComponent(entryId)}`,
    { method: "DELETE" }
  )
  if (!res.ok) throw new Error(await parseError(res))
}

export async function submitManualJournalEntry(
  legalEntityCode: DocumentEntityCode,
  entryId: string
): Promise<ManualJournalEntryRead> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BASE}/${encodeURIComponent(entryId)}/submit`,
    { method: "POST" }
  )
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: ManualJournalEntryRead }
  return body.entry
}

export async function confirmManualJournalEntry(
  legalEntityCode: DocumentEntityCode,
  entryId: string
): Promise<ManualJournalEntryRead> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BASE}/${encodeURIComponent(entryId)}/confirm`,
    { method: "POST" }
  )
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: ManualJournalEntryRead }
  return body.entry
}

export async function cancelManualJournalEntry(
  legalEntityCode: DocumentEntityCode,
  entryId: string,
  payload: CancelManualJournalEntryPayload = {}
): Promise<ManualJournalEntryRead> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BASE}/${encodeURIComponent(entryId)}/cancel`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  )
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: ManualJournalEntryRead }
  return body.entry
}

export async function postManualJournalEntry(
  legalEntityCode: DocumentEntityCode,
  entryId: string
): Promise<{
  entry: ManualJournalEntryRead
  pdfStatus: "ready" | "pending"
  pdfError?: string
}> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BASE}/${encodeURIComponent(entryId)}/post`,
    { method: "POST" }
  )
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as {
    entry: ManualJournalEntryRead
    pdfStatus?: "ready" | "pending"
    pdfError?: string
  }
  return {
    entry: body.entry,
    pdfStatus:
      body.pdfStatus ??
      (body.entry.pdfSnapshotReady ? "ready" : "pending"),
    pdfError: body.pdfError,
  }
}

export async function retryManualJournalEntryPdf(
  legalEntityCode: DocumentEntityCode,
  entryId: string
): Promise<{
  entry: ManualJournalEntryRead
  pdfStatus: "ready" | "pending"
  pdfError?: string
}> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BASE}/${encodeURIComponent(entryId)}/pdf/retry`,
    { method: "POST" }
  )
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as {
    entry: ManualJournalEntryRead
    pdfStatus?: "ready" | "pending"
    pdfError?: string
  }
  return {
    entry: body.entry,
    pdfStatus:
      body.pdfStatus ??
      (body.entry.pdfSnapshotReady ? "ready" : "pending"),
    pdfError: body.pdfError,
  }
}

export async function deleteManualJournalEntryArchivedPdf(
  legalEntityCode: DocumentEntityCode,
  entryId: string
): Promise<{ entry: ManualJournalEntryRead }> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BASE}/${encodeURIComponent(entryId)}/pdf`,
    { method: "DELETE" }
  )
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: ManualJournalEntryRead }
  return { entry: body.entry }
}

export function buildManualJournalEntryPdfUrl(
  legalEntityCode: DocumentEntityCode,
  entryId: string,
  disposition: "inline" | "attachment" = "inline",
  cacheKey?: string | null
): string {
  const params = new URLSearchParams({ disposition })
  const version = String(cacheKey ?? "").trim()
  if (version) params.set("v", version)
  return appendFinanceLegalEntityToApiUrl(
    `${BASE}/${encodeURIComponent(entryId)}/pdf?${params.toString()}`,
    legalEntityCode
  )
}
