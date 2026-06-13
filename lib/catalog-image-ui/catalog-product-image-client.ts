/**
 * Client fetch for catalog product images — uses the same server resolver as POS
 * (`resolveCatalogProductImageUrl` via GET /api/catalog-image/product-url).
 */

export type CatalogProductImageUrlResponse = {
  productCode: string
  imageUrl: string | null
}

const urlCache = new Map<string, string | null>()
const inflight = new Map<string, Promise<string | null>>()

export function clearCatalogProductImageUrlCache(): void {
  urlCache.clear()
  inflight.clear()
}

export async function fetchCatalogProductImageUrl(
  productCode: string
): Promise<string | null> {
  const code = String(productCode ?? "").trim()
  if (!code) return null

  if (urlCache.has(code)) {
    return urlCache.get(code) ?? null
  }

  let pending = inflight.get(code)
  if (!pending) {
    pending = (async () => {
      try {
        const params = new URLSearchParams({ code })
        const res = await fetch(`/api/catalog-image/product-url?${params.toString()}`, {
          cache: "no-store",
        })
        if (!res.ok) {
          urlCache.set(code, null)
          return null
        }
        const body = (await res.json()) as CatalogProductImageUrlResponse
        const imageUrl = body.imageUrl ?? null
        urlCache.set(code, imageUrl)
        return imageUrl
      } catch {
        urlCache.set(code, null)
        return null
      } finally {
        inflight.delete(code)
      }
    })()
    inflight.set(code, pending)
  }

  return pending
}
