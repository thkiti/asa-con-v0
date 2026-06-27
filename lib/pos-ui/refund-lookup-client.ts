import type { RefundLookupResult } from "@/lib/pos/refund-lookup-types"

export type RefundLookupSearchParams = {
  branchId: string
  refundNo?: string
}

export type RefundLookupFetchResult =
  | { ok: true; result: RefundLookupResult }
  | { ok: false; error: string }

export async function fetchRefundLookup(
  params: RefundLookupSearchParams
): Promise<RefundLookupFetchResult> {
  const search = new URLSearchParams({ branchId: params.branchId.trim() })
  if (params.refundNo?.trim()) {
    search.set("refundNo", params.refundNo.trim())
  }

  const res = await fetch(`/api/pos/refunds/lookup?${search.toString()}`)
  const body = (await res.json().catch(() => ({}))) as {
    error?: string
    refunds?: RefundLookupResult["refunds"]
  }

  if (!res.ok) {
    return { ok: false, error: body.error ?? "Refund lookup failed" }
  }

  return { ok: true, result: { refunds: body.refunds ?? [] } }
}
