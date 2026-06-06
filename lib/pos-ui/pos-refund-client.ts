import type { RefundPreviewResult } from "@/lib/pos/refund"
import type { RefundableReceiptSummary } from "@/lib/pos/search-refundable-receipts"

export type { RefundableReceiptSummary }

export type PosRefundPreviewResult =
  | { ok: true; preview: RefundPreviewResult }
  | { ok: false; status: number; error: string; code?: string }

export type PosRefundSubmitResult =
  | {
      ok: true
      refund: {
        id: string
        refundNo: string
        amount: string
      }
    }
  | { ok: false; status: number; error: string; code?: string }

export type PosRefundableReceiptsResult =
  | { ok: true; receipts: RefundableReceiptSummary[] }
  | { ok: false; status: number; error: string; code?: string }

export function formatRecentSaleReceiptDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

export function formatRecentSaleReceiptOption(row: RefundableReceiptSummary): string {
  const date = formatRecentSaleReceiptDate(row.issuedAt)
  return date ? `${row.receiptNo} / ${date}` : row.receiptNo
}

export async function fetchPosRefundableReceipts(
  query?: string,
  fetchFn: typeof fetch = fetch
): Promise<PosRefundableReceiptsResult> {
  const params = new URLSearchParams()
  const trimmed = query?.trim()
  if (trimmed) params.set("query", trimmed)

  const qs = params.toString()
  const url = qs ? `/api/pos/refund/receipts?${qs}` : "/api/pos/refund/receipts"
  const res = await fetchFn(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  const payload = (await res.json().catch(() => ({}))) as {
    receipts?: RefundableReceiptSummary[]
    error?: string
    code?: string
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: payload.error ?? "Receipt search failed",
      code: payload.code,
    }
  }

  return { ok: true, receipts: payload.receipts ?? [] }
}

export async function fetchPosRefundPreviewByReceiptNo(
  receiptNo: string,
  fetchFn: typeof fetch = fetch
): Promise<PosRefundPreviewResult> {
  const trimmed = receiptNo.trim()
  if (!trimmed) {
    return { ok: false, status: 400, error: "Receipt number is required", code: "MISSING_RECEIPT" }
  }

  const params = new URLSearchParams({ receiptNo: trimmed })
  const res = await fetchFn(`/api/pos/refund/preview?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })

  const payload = (await res.json().catch(() => ({}))) as RefundPreviewResult & {
    error?: string
    code?: string
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: payload.error ?? "Refund preview failed",
      code: payload.code,
    }
  }

  if (!payload.saleId?.trim()) {
    return { ok: false, status: 500, error: "Invalid preview response", code: "POS_ERROR" }
  }

  return { ok: true, preview: payload }
}

export async function fetchPosRefund(
  input: {
    saleId: string
    amount?: string
    reasonCode: string
  },
  fetchFn: typeof fetch = fetch
): Promise<PosRefundSubmitResult> {
  const saleId = input.saleId.trim()
  if (!saleId) {
    return { ok: false, status: 400, error: "Sale is required", code: "MISSING_SALE" }
  }

  const reasonCode = input.reasonCode.trim()
  if (!reasonCode) {
    return { ok: false, status: 400, error: "Refund reason is required", code: "MISSING_REASON" }
  }

  const body: Record<string, string> = { saleId, reasonCode }
  const amount = input.amount?.trim()
  if (amount) body.amount = amount

  const res = await fetchFn("/api/pos/refund", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const payload = (await res.json().catch(() => ({}))) as {
    refund?: { id?: string; refundNo?: string; amount?: string }
    error?: string
    code?: string
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: payload.error ?? "Refund failed",
      code: payload.code,
    }
  }

  const refund = payload.refund
  if (!refund?.id?.trim() || !refund.refundNo?.trim()) {
    return { ok: false, status: 500, error: "Invalid refund response", code: "POS_ERROR" }
  }

  return {
    ok: true,
    refund: {
      id: refund.id,
      refundNo: refund.refundNo,
      amount: refund.amount ?? "0.00",
    },
  }
}
