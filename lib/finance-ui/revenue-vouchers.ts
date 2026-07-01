import type {
  RevenueVoucherListFilter,
  RevenueVoucherListResult,
  RevenueVoucherRead,
} from "@/lib/finance/revenue-voucher/revenue-voucher-read-types"
import type { RevenueVoucherSaveLineInput } from "@/lib/finance/revenue-voucher/revenue-voucher-types"

export type {
  RevenueVoucherListFilter,
  RevenueVoucherListItem,
  RevenueVoucherListResult,
  RevenueVoucherRead,
} from "@/lib/finance/revenue-voucher/revenue-voucher-read-types"

export type RevenueVoucherListFilterInput = Omit<
  RevenueVoucherListFilter,
  "dateFrom" | "dateTo"
> & {
  dateFrom?: string
  dateTo?: string
  postingState?: "posted" | "unposted"
}

export type CreateRevenueVoucherDraftPayload = {
  branchId: string
  legalEntityCode: string
  entryDate: string
  receiveToAccountId: string
  receivedFromName: string
  description?: string | null
  refNo?: string | null
  receiptNo?: string | null
  lines: RevenueVoucherSaveLineInput[]
}

export type UpdateRevenueVoucherDraftPayload = {
  entryDate?: string
  receiveToAccountId?: string
  receivedFromName?: string
  description?: string | null
  refNo?: string | null
  receiptNo?: string | null
  lines: RevenueVoucherSaveLineInput[]
}

export type CancelRevenueVoucherPayload = {
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

function buildListQuery(filter: RevenueVoucherListFilterInput = {}): string {
  const params = new URLSearchParams()
  if (filter.legalEntityCode?.trim()) {
    params.set("legalEntityCode", filter.legalEntityCode.trim())
  }
  if (filter.status) params.set("status", filter.status)
  if (filter.branchId?.trim()) params.set("branchId", filter.branchId.trim())
  if (filter.search?.trim()) params.set("search", filter.search.trim())
  if (filter.postingState) params.set("postingState", filter.postingState)
  if (filter.dateFrom?.trim()) params.set("dateFrom", filter.dateFrom.trim())
  if (filter.dateTo?.trim()) params.set("dateTo", filter.dateTo.trim())
  if (filter.limit != null) params.set("limit", String(filter.limit))
  if (filter.offset != null) params.set("offset", String(filter.offset))
  const q = params.toString()
  return q ? `?${q}` : ""
}

const BASE = "/api/finance/revenue-vouchers"

export async function fetchRevenueVouchers(
  filter: RevenueVoucherListFilterInput = {}
): Promise<RevenueVoucherListResult> {
  const res = await fetch(`${BASE}${buildListQuery(filter)}`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<RevenueVoucherListResult>
}

export async function fetchRevenueVoucher(
  entryId: string
): Promise<RevenueVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}`)
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: RevenueVoucherRead }
  return body.entry
}

export async function createRevenueVoucherDraft(
  payload: CreateRevenueVoucherDraftPayload
): Promise<RevenueVoucherRead> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: RevenueVoucherRead }
  return body.entry
}

export async function updateRevenueVoucherDraft(
  entryId: string,
  payload: UpdateRevenueVoucherDraftPayload
): Promise<RevenueVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: RevenueVoucherRead }
  return body.entry
}

export async function deleteDraftRevenueVoucher(entryId: string): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}`, {
    method: "DELETE",
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function submitRevenueVoucher(
  entryId: string
): Promise<RevenueVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}/submit`, {
    method: "POST",
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: RevenueVoucherRead }
  return body.entry
}

export async function confirmRevenueVoucher(
  entryId: string
): Promise<RevenueVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}/confirm`, {
    method: "POST",
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: RevenueVoucherRead }
  return body.entry
}

export async function cancelRevenueVoucher(
  entryId: string,
  payload: CancelRevenueVoucherPayload = {}
): Promise<RevenueVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: RevenueVoucherRead }
  return body.entry
}

export async function postRevenueVoucher(
  entryId: string
): Promise<RevenueVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}/post`, {
    method: "POST",
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: RevenueVoucherRead }
  return body.entry
}
