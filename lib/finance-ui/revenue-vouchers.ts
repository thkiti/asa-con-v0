import {
  financeScopedFetch,
} from "@/lib/finance-ui/finance-entity-scope"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
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
  legalEntityCode: DocumentEntityCode,
  filter: RevenueVoucherListFilterInput = {}
): Promise<RevenueVoucherListResult> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BASE}${buildListQuery({ ...filter, legalEntityCode })}`
  )
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<RevenueVoucherListResult>
}

export async function fetchRevenueVoucher(
  legalEntityCode: DocumentEntityCode,
  entryId: string
): Promise<RevenueVoucherRead> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BASE}/${encodeURIComponent(entryId)}`
  )
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: RevenueVoucherRead }
  return body.entry
}

export async function createRevenueVoucherDraft(
  legalEntityCode: DocumentEntityCode,
  payload: CreateRevenueVoucherDraftPayload
): Promise<RevenueVoucherRead> {
  const res = await financeScopedFetch(legalEntityCode, BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: RevenueVoucherRead }
  return body.entry
}

export async function updateRevenueVoucherDraft(
  legalEntityCode: DocumentEntityCode,
  entryId: string,
  payload: UpdateRevenueVoucherDraftPayload
): Promise<RevenueVoucherRead> {
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
  const body = (await res.json()) as { entry: RevenueVoucherRead }
  return body.entry
}

export async function deleteDraftRevenueVoucher(legalEntityCode: DocumentEntityCode, entryId: string): Promise<void> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BASE}/${encodeURIComponent(entryId)}`,
    { method: "DELETE" }
  )
  if (!res.ok) throw new Error(await parseError(res))
}

export async function submitRevenueVoucher(
  legalEntityCode: DocumentEntityCode,
  entryId: string
): Promise<RevenueVoucherRead> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BASE}/${encodeURIComponent(entryId)}/submit`,
    { method: "POST" }
  )
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: RevenueVoucherRead }
  return body.entry
}

export async function confirmRevenueVoucher(
  legalEntityCode: DocumentEntityCode,
  entryId: string
): Promise<RevenueVoucherRead> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BASE}/${encodeURIComponent(entryId)}/confirm`,
    { method: "POST" }
  )
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: RevenueVoucherRead }
  return body.entry
}

export async function cancelRevenueVoucher(
  legalEntityCode: DocumentEntityCode,
  entryId: string,
  payload: CancelRevenueVoucherPayload = {}
): Promise<RevenueVoucherRead> {
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
  const body = (await res.json()) as { entry: RevenueVoucherRead }
  return body.entry
}

export async function postRevenueVoucher(
  legalEntityCode: DocumentEntityCode,
  entryId: string
): Promise<RevenueVoucherRead> {
  const res = await financeScopedFetch(
    legalEntityCode,
    `${BASE}/${encodeURIComponent(entryId)}/post`,
    { method: "POST" }
  )
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: RevenueVoucherRead }
  return body.entry
}
