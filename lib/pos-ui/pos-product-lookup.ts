import type { PosCartProduct } from "@/lib/pos/cart"

export type PosProductLookupResult =
  | { ok: true; product: PosCartProduct }
  | { ok: false; status: number; error: string; code?: string }

export async function fetchPosProductLookup(
  code: string,
  fetchFn: typeof fetch = fetch
): Promise<PosProductLookupResult> {
  const trimmed = code.trim()
  if (!trimmed) {
    return { ok: false, status: 400, error: "Product code is required", code: "INVALID_CODE" }
  }

  const url = `/api/pos/products/lookup?code=${encodeURIComponent(trimmed)}`
  const res = await fetchFn(url, { method: "GET", credentials: "include", cache: "no-store" })

  const payload = (await res.json().catch(() => ({}))) as {
    product?: PosCartProduct
    error?: string
    code?: string
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: payload.error ?? "Product lookup failed",
      code: payload.code,
    }
  }

  if (!payload.product?.productId) {
    return { ok: false, status: 500, error: "Invalid lookup response", code: "POS_ERROR" }
  }

  return { ok: true, product: payload.product }
}
