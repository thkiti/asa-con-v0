import type {
  ManualJournalEntryListFilter,
  ManualJournalEntryListResult,
  ManualJournalEntryRead,
  ManualJournalEntryListItem,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-read-types"
import type { ManualJournalSaveLineInput } from "@/lib/finance/manual-journal-entry/manual-journal-entry-types"

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
  filter: ManualJournalEntryListFilterInput = {}
): Promise<ManualJournalEntryListResult> {
  const res = await fetch(`${BASE}${buildListQuery(filter)}`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<ManualJournalEntryListResult>
}

export async function fetchManualJournalEntry(
  entryId: string
): Promise<ManualJournalEntryRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}`)
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: ManualJournalEntryRead }
  return body.entry
}

export async function createManualJournalEntryDraft(
  payload: CreateManualJournalEntryDraftPayload
): Promise<ManualJournalEntryRead> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: ManualJournalEntryRead }
  return body.entry
}

export async function updateManualJournalEntryDraft(
  entryId: string,
  payload: UpdateManualJournalEntryDraftPayload
): Promise<ManualJournalEntryRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: ManualJournalEntryRead }
  return body.entry
}

export async function deleteDraftManualJournalEntry(entryId: string): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}`, {
    method: "DELETE",
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function submitManualJournalEntry(
  entryId: string
): Promise<ManualJournalEntryRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}/submit`, {
    method: "POST",
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: ManualJournalEntryRead }
  return body.entry
}

export async function confirmManualJournalEntry(
  entryId: string
): Promise<ManualJournalEntryRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}/confirm`, {
    method: "POST",
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: ManualJournalEntryRead }
  return body.entry
}

export async function cancelManualJournalEntry(
  entryId: string,
  payload: CancelManualJournalEntryPayload = {}
): Promise<ManualJournalEntryRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: ManualJournalEntryRead }
  return body.entry
}

export async function postManualJournalEntry(
  entryId: string
): Promise<{
  entry: ManualJournalEntryRead
  pdfStatus: "ready" | "pending"
  pdfError?: string
}> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}/post`, {
    method: "POST",
  })
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
  entryId: string
): Promise<{
  entry: ManualJournalEntryRead
  pdfStatus: "ready" | "pending"
  pdfError?: string
}> {
  const res = await fetch(
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

export function buildManualJournalEntryPdfUrl(
  entryId: string,
  disposition: "inline" | "attachment" = "inline"
): string {
  const params = new URLSearchParams({ disposition })
  return `${BASE}/${encodeURIComponent(entryId)}/pdf?${params.toString()}`
}
