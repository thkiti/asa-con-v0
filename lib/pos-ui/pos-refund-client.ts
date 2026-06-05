import type { RefundPreviewResult } from "@/lib/pos/refund"

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
    reason?: string | null
  },
  fetchFn: typeof fetch = fetch
): Promise<PosRefundSubmitResult> {
  const saleId = input.saleId.trim()
  if (!saleId) {
    return { ok: false, status: 400, error: "Sale is required", code: "MISSING_SALE" }
  }

  const body: Record<string, string> = { saleId }
  const amount = input.amount?.trim()
  if (amount) body.amount = amount
  const reason = input.reason?.trim()
  if (reason) body.reason = reason

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
