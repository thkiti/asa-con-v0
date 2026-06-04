import type { PricingPolicyRow, ProductWithActiveSellingPrice, SellingPriceRow } from "@/lib/pricing"
import type { SellingPriceGroupPreview } from "@/lib/pricing/reference-product-group"

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) {
    throw new Error(
      typeof (data as { error?: string }).error === "string"
        ? (data as { error?: string }).error
        : `Request failed (${res.status})`
    )
  }
  return data
}

export async function fetchPricingPolicies(): Promise<PricingPolicyRow[]> {
  const res = await fetch("/api/master/pricing/policy", { cache: "no-store" })
  const data = await parseJson<{ items: PricingPolicyRow[] }>(res)
  return data.items
}

export async function createPricingPolicy(body: {
  marketType: string
  pricingClass: string
  markupPercent: number
  roundingMode: string
  threshold?: number | null
}): Promise<PricingPolicyRow> {
  const res = await fetch("/api/master/pricing/policy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await parseJson<{ item: PricingPolicyRow }>(res)
  return data.item
}

export async function fetchPolicyLookup(
  marketType: string,
  pricingClass: string
): Promise<PricingPolicyRow | null> {
  const params = new URLSearchParams({ marketType, pricingClass })
  const res = await fetch(`/api/master/pricing/policy/lookup?${params}`, {
    cache: "no-store",
  })
  const data = await parseJson<{ policy: PricingPolicyRow | null }>(res)
  return data.policy
}

export async function fetchSellingPriceProducts(): Promise<
  ProductWithActiveSellingPrice[]
> {
  const res = await fetch("/api/master/pricing/selling-price/products", {
    cache: "no-store",
  })
  const data = await parseJson<{ items: ProductWithActiveSellingPrice[] }>(res)
  return data.items
}

export async function setSellingPriceItem(body: {
  productId: string
  price: number
}): Promise<SellingPriceRow> {
  const res = await fetch("/api/master/pricing/selling-price", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await parseJson<{ item: SellingPriceRow }>(res)
  return data.item
}

export async function fetchSellingPriceGroupPreview(
  productId: string
): Promise<SellingPriceGroupPreview> {
  const params = new URLSearchParams({ productId })
  const res = await fetch(
    `/api/master/pricing/selling-price/group/preview?${params}`,
    { cache: "no-store" }
  )
  return parseJson<SellingPriceGroupPreview>(res)
}

export async function setSellingPriceGroup(body: {
  anchorProductId: string
  newPrice: number
  expectedOldPrice: number | null
}): Promise<{
  updatedCount: number
  updatedIds: string[]
  skipped: Array<{ productId: string; code: string; name: string; reason: string }>
}> {
  const res = await fetch("/api/master/pricing/selling-price/group", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseJson(res)
}
