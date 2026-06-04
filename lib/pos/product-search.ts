import type { PrismaClient, ProductType } from "@/generated/prisma/client"
import { normalizeReferenceProductCode } from "@/lib/import/validation/product-code"
import { cleanGroupDisplayName } from "@/lib/master/build-product-group"
import { resolvePosRetailPrice } from "@/lib/pricing/resolve-pos-retail-price"
import { isSellableProductType } from "@/lib/products/product-type-rules"
import type { PosCartProduct } from "./cart"
import { PosLookupError } from "./pos-errors"

export type PosProductLookupDb = Pick<PrismaClient, "product" | "sellingPrice">

const productSelect = {
  id: true,
  code: true,
  name: true,
  productType: true,
  deleted: true,
} as const

function trimPosLookupInput(raw: string): string {
  return String(raw ?? "").trim()
}

/** Reference-barcode normalization — fallback only, not primary POS lookup. */
export function posLookupCodeCandidates(raw: string): string[] {
  const exact = trimPosLookupInput(raw)
  if (!exact) return []

  const candidates = [exact]
  const normalized = normalizeReferenceProductCode(raw)
  if (normalized && normalized !== exact && !candidates.includes(normalized)) {
    candidates.push(normalized)
  }
  return candidates
}

async function findProductByCode(
  db: PosProductLookupDb,
  code: string
): Promise<{
  id: string
  code: string
  name: string
  productType: ProductType
  deleted: boolean
} | null> {
  return db.product.findUnique({
    where: { code },
    select: productSelect,
  })
}

export async function lookupPosProductByCode(
  db: PosProductLookupDb,
  rawCode: string
): Promise<PosCartProduct> {
  const input = trimPosLookupInput(rawCode)
  if (!input) {
    throw new PosLookupError("Product code is required", "INVALID_CODE", 400)
  }

  const candidates = posLookupCodeCandidates(rawCode)
  let product: Awaited<ReturnType<typeof findProductByCode>> = null

  for (const code of candidates) {
    const row = await findProductByCode(db, code)
    if (row && !row.deleted) {
      product = row
      break
    }
  }

  if (!product) {
    throw new PosLookupError(
      `Product not found: ${input}`,
      "PRODUCT_NOT_FOUND",
      404
    )
  }

  if (!isSellableProductType(product.productType)) {
    throw new PosLookupError(
      `Product type not sellable at POS: ${product.productType}`,
      "NOT_SELLABLE",
      400
    )
  }

  const resolved = await resolvePosRetailPrice(db, { productId: product.id })
  if (resolved == null) {
    throw new PosLookupError(
      "No active selling price for this product",
      "NO_ACTIVE_PRICE",
      400
    )
  }

  return {
    productId: product.id,
    code: product.code,
    name: cleanGroupDisplayName(product.name),
    unitPrice: resolved.price.toFixed(2),
    priceSource: resolved.source,
  }
}
