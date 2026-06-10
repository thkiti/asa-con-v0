import type {
  JournalInquiryResult,
  JournalListResult,
  ManualJournalLineInput,
  PostedVoucherResult,
} from "./types"

export type JournalListFilter = {
  branchId?: string
  periodKey?: string
  from?: string
  to?: string
  refType?: string
  limit?: number
  offset?: number
}

export type PostManualJournalPayload = {
  branchId: string
  date: string
  description?: string | null
  refNo?: string | null
  idempotencyKey: string
  lines: ManualJournalLineInput[]
}

export type ReverseJournalPayload = {
  reversalDate: string
  reason: string
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

function buildQuery(filter: JournalListFilter): string {
  const params = new URLSearchParams()
  if (filter.branchId?.trim()) params.set("branchId", filter.branchId.trim())
  if (filter.periodKey?.trim()) params.set("periodKey", filter.periodKey.trim())
  if (filter.from?.trim()) params.set("from", filter.from.trim())
  if (filter.to?.trim()) params.set("to", filter.to.trim())
  if (filter.refType?.trim()) params.set("refType", filter.refType.trim())
  if (filter.limit != null) params.set("limit", String(filter.limit))
  if (filter.offset != null) params.set("offset", String(filter.offset))
  const q = params.toString()
  return q ? `?${q}` : ""
}

export async function fetchJournalEntries(
  filter: JournalListFilter = {}
): Promise<JournalListResult> {
  const res = await fetch(`/api/finance/journal-entries${buildQuery(filter)}`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<JournalListResult>
}

export async function fetchJournalInquiry(
  journalEntryId: string
): Promise<JournalInquiryResult> {
  const res = await fetch(`/api/finance/journal-entries/${journalEntryId}`)
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { journal: JournalInquiryResult }
  return body.journal
}

export async function postManualJournal(
  payload: PostManualJournalPayload
): Promise<PostedVoucherResult> {
  const res = await fetch("/api/finance/journal-entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { posted: PostedVoucherResult }
  return body.posted
}

export async function reverseJournal(
  journalEntryId: string,
  payload: ReverseJournalPayload
): Promise<PostedVoucherResult> {
  const res = await fetch(`/api/finance/journal-entries/${journalEntryId}/reverse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { posted: PostedVoucherResult }
  return body.posted
}
