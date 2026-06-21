import type {
  PettyCashVoucherListFilter,
  PettyCashVoucherListResult,
  PettyCashVoucherRead,
} from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-read-types"
import type { PettyCashVoucherSaveLineInput } from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-types"

export type {
  PettyCashVoucherListFilter,
  PettyCashVoucherListItem,
  PettyCashVoucherListResult,
  PettyCashVoucherRead,
} from "@/lib/finance/petty-cash-voucher/petty-cash-voucher-read-types"

export type PettyCashVoucherListFilterInput = Omit<
  PettyCashVoucherListFilter,
  "dateFrom" | "dateTo"
> & {
  dateFrom?: string
  dateTo?: string
}

export type CreatePettyCashVoucherDraftPayload = {
  branchId: string
  legalEntityCode: string
  entryDate: string
  pettyCashAccountId: string
  payeeName: string
  description?: string | null
  refNo?: string | null
  lines: PettyCashVoucherSaveLineInput[]
}

export type UpdatePettyCashVoucherDraftPayload = {
  entryDate?: string
  payeeName?: string
  description?: string | null
  refNo?: string | null
  lines: PettyCashVoucherSaveLineInput[]
}

export type CancelPettyCashVoucherPayload = {
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

function buildListQuery(filter: PettyCashVoucherListFilterInput = {}): string {
  const params = new URLSearchParams()
  if (filter.legalEntityCode?.trim()) {
    params.set("legalEntityCode", filter.legalEntityCode.trim())
  }
  if (filter.status) params.set("status", filter.status)
  if (filter.branchId?.trim()) params.set("branchId", filter.branchId.trim())
  if (filter.search?.trim()) params.set("search", filter.search.trim())
  if (filter.dateFrom?.trim()) params.set("dateFrom", filter.dateFrom.trim())
  if (filter.dateTo?.trim()) params.set("dateTo", filter.dateTo.trim())
  if (filter.limit != null) params.set("limit", String(filter.limit))
  if (filter.offset != null) params.set("offset", String(filter.offset))
  const q = params.toString()
  return q ? `?${q}` : ""
}

const BASE = "/api/finance/petty-cash-vouchers"

export async function fetchPettyCashVouchers(
  filter: PettyCashVoucherListFilterInput = {}
): Promise<PettyCashVoucherListResult> {
  const res = await fetch(`${BASE}${buildListQuery(filter)}`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<PettyCashVoucherListResult>
}

export async function fetchPettyCashVoucher(
  entryId: string
): Promise<PettyCashVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}`)
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: PettyCashVoucherRead }
  return body.entry
}

export async function createPettyCashVoucherDraft(
  payload: CreatePettyCashVoucherDraftPayload
): Promise<PettyCashVoucherRead> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: PettyCashVoucherRead }
  return body.entry
}

export async function updatePettyCashVoucherDraft(
  entryId: string,
  payload: UpdatePettyCashVoucherDraftPayload
): Promise<PettyCashVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: PettyCashVoucherRead }
  return body.entry
}

export async function deleteDraftPettyCashVoucher(entryId: string): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}`, {
    method: "DELETE",
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function submitPettyCashVoucher(
  entryId: string
): Promise<PettyCashVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}/submit`, {
    method: "POST",
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: PettyCashVoucherRead }
  return body.entry
}

export async function confirmPettyCashVoucher(
  entryId: string
): Promise<PettyCashVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}/confirm`, {
    method: "POST",
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: PettyCashVoucherRead }
  return body.entry
}

export async function cancelPettyCashVoucher(
  entryId: string,
  payload: CancelPettyCashVoucherPayload = {}
): Promise<PettyCashVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: PettyCashVoucherRead }
  return body.entry
}

export async function postPettyCashVoucher(
  entryId: string
): Promise<PettyCashVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}/post`, {
    method: "POST",
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: PettyCashVoucherRead }
  return body.entry
}
