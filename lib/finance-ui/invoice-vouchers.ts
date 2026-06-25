import type {
  InvoiceVoucherListFilter,
  InvoiceVoucherListResult,
  InvoiceVoucherRead,
} from "@/lib/finance/invoice-voucher/invoice-voucher-read-types"
import type { InvoiceVoucherSaveLineInput } from "@/lib/finance/invoice-voucher/invoice-voucher-types"

export type {
  InvoiceVoucherListFilter,
  InvoiceVoucherListItem,
  InvoiceVoucherListResult,
  InvoiceVoucherRead,
} from "@/lib/finance/invoice-voucher/invoice-voucher-read-types"

export type InvoiceVoucherListFilterInput = Omit<
  InvoiceVoucherListFilter,
  "dateFrom" | "dateTo"
> & {
  dateFrom?: string
  dateTo?: string
}

export type CreateInvoiceVoucherDraftPayload = {
  branchId: string
  legalEntityCode: string
  invoiceDate: string
  dueDate?: string | null
  customerName: string
  description?: string | null
  refNo?: string | null
  lines: InvoiceVoucherSaveLineInput[]
}

export type UpdateInvoiceVoucherDraftPayload = {
  invoiceDate?: string
  dueDate?: string | null
  customerName?: string
  description?: string | null
  refNo?: string | null
  lines: InvoiceVoucherSaveLineInput[]
}

export type CancelInvoiceVoucherPayload = {
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

function buildListQuery(filter: InvoiceVoucherListFilterInput = {}): string {
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

const BASE = "/api/finance/invoice-vouchers"

export async function fetchInvoiceVouchers(
  filter: InvoiceVoucherListFilterInput = {}
): Promise<InvoiceVoucherListResult> {
  const res = await fetch(`${BASE}${buildListQuery(filter)}`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<InvoiceVoucherListResult>
}

export async function fetchInvoiceVoucher(
  entryId: string
): Promise<InvoiceVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}`)
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: InvoiceVoucherRead }
  return body.entry
}

export async function createInvoiceVoucherDraft(
  payload: CreateInvoiceVoucherDraftPayload
): Promise<InvoiceVoucherRead> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: InvoiceVoucherRead }
  return body.entry
}

export async function updateInvoiceVoucherDraft(
  entryId: string,
  payload: UpdateInvoiceVoucherDraftPayload
): Promise<InvoiceVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: InvoiceVoucherRead }
  return body.entry
}

export async function deleteDraftInvoiceVoucher(entryId: string): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}`, {
    method: "DELETE",
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function submitInvoiceVoucher(
  entryId: string
): Promise<InvoiceVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}/submit`, {
    method: "POST",
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: InvoiceVoucherRead }
  return body.entry
}

export async function confirmInvoiceVoucher(
  entryId: string
): Promise<InvoiceVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}/confirm`, {
    method: "POST",
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: InvoiceVoucherRead }
  return body.entry
}

export async function cancelInvoiceVoucher(
  entryId: string,
  payload: CancelInvoiceVoucherPayload = {}
): Promise<InvoiceVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: InvoiceVoucherRead }
  return body.entry
}

export async function postInvoiceVoucher(
  entryId: string
): Promise<InvoiceVoucherRead> {
  const res = await fetch(`${BASE}/${encodeURIComponent(entryId)}/post`, {
    method: "POST",
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { entry: InvoiceVoucherRead }
  return body.entry
}
