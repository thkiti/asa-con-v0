import type { CheckoutResult } from "@/lib/pos/checkout-types"

export type PosCheckoutLinePayload = {
  productId: string
  qty: number
}

export type PosCheckoutResult =
  | { ok: true; result: CheckoutResult }
  | { ok: false; status: number; error: string; code?: string }

export async function fetchPosCheckout(
  lines: readonly PosCheckoutLinePayload[],
  fetchFn: typeof fetch = fetch
): Promise<PosCheckoutResult> {
  if (lines.length === 0) {
    return { ok: false, status: 400, error: "Cart is empty", code: "EMPTY_CART" }
  }

  const res = await fetchFn("/api/pos/checkout", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lines: lines.map((line) => ({
        productId: line.productId,
        qty: line.qty,
      })),
    }),
  })

  const payload = (await res.json().catch(() => ({}))) as CheckoutResult & {
    error?: string
    code?: string
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: payload.error ?? "Checkout failed",
      code: payload.code,
    }
  }

  if (!payload.sale?.id || !payload.receipt?.receiptNo) {
    return { ok: false, status: 500, error: "Invalid checkout response", code: "POS_ERROR" }
  }

  return { ok: true, result: payload }
}
