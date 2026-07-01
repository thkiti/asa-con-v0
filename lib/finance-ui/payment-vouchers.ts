import type {
  PaymentVoucherListFilter,
  PaymentVoucherListResult,
  PaymentVoucherRead,
} from "@/lib/finance/payment-voucher/payment-voucher-read-types"
import type { PaymentVoucherSaveLineInput } from "@/lib/finance/payment-voucher/payment-voucher-types"

export type {
  PaymentVoucherListFilter,
  PaymentVoucherListItem,
  PaymentVoucherListResult,
  PaymentVoucherRead,
} from "@/lib/finance/payment-voucher/payment-voucher-read-types"

export type PaymentVoucherListFilterInput = Omit<
  PaymentVoucherListFilter,
  "dateFrom" | "dateTo"
> & {
  dateFrom?: string
  dateTo?: string
  postingState?: "posted" | "unposted"
}

export type CreatePaymentVoucherDraftPayload = {
  branchId: string
  legalEntityCode: string
  entryDate: string
  payFromAccountId: string
  payeeName: string
  description?: string | null
  refNo?: string | null
  chequeNo?: string | null
  lines: PaymentVoucherSaveLineInput[]
}

export type UpdatePaymentVoucherDraftPayload = {
  entryDate?: string
  payFromAccountId?: string
  payeeName?: string
  description?: string | null
  refNo?: string | null
  chequeNo?: string | null
  lines: PaymentVoucherSaveLineInput[]
}

export type CancelPaymentVoucherPayload = {
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

function buildListQuery(filter: PaymentVoucherListFilterInput = {}): string {
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

const BASE = "/api/finance/payment-vouchers"

export async function fetchPaymentVouchers(
  filter: PaymentVoucherListFilterInput = {}
): Promise<PaymentVoucherListResult> {
  const res = await fetch(`${BASE}${buildListQuery(filter)}`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<PaymentVoucherListResult>
}

export async function fetchPaymentVoucher(
  entryId: string
): Promise<PaymentVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}`)
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: PaymentVoucherRead }
  return body.entry
}

export async function createPaymentVoucherDraft(
  payload: CreatePaymentVoucherDraftPayload
): Promise<PaymentVoucherRead> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: PaymentVoucherRead }
  return body.entry
}

export async function updatePaymentVoucherDraft(
  entryId: string,
  payload: UpdatePaymentVoucherDraftPayload
): Promise<PaymentVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: PaymentVoucherRead }
  return body.entry
}

export async function deleteDraftPaymentVoucher(entryId: string): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}`, {
    method: "DELETE",
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function submitPaymentVoucher(
  entryId: string
): Promise<PaymentVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}/submit`, {
    method: "POST",
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: PaymentVoucherRead }
  return body.entry
}

export async function confirmPaymentVoucher(
  entryId: string
): Promise<PaymentVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}/confirm`, {
    method: "POST",
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: PaymentVoucherRead }
  return body.entry
}

export async function cancelPaymentVoucher(
  entryId: string,
  payload: CancelPaymentVoucherPayload = {}
): Promise<PaymentVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: PaymentVoucherRead }
  return body.entry
}

export async function postPaymentVoucher(
  entryId: string
): Promise<PaymentVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}/post`, {
    method: "POST",
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: PaymentVoucherRead }
  return body.entry
}
