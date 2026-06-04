import type { PrismaClient } from "@/generated/prisma/client"
import { normalizeReferenceProductCode } from "@/lib/import/validation/product-code"
import { cleanGroupDisplayName } from "@/lib/master/build-product-group"
import { resolvePosRetailPrice } from "@/lib/pricing/resolve-pos-retail-price"
import { isSellableProductType } from "@/lib/products/product-type-rules"
import type { PosCartProduct } from "./cart"
import { PosLookupError } from "./pos-errors"

export type PosProductLookupDb = Pick<PrismaClient, "product" | "sellingPrice">

export async function lookupPosProductByCode(
  db: PosProductLookupDb,
  rawCode: string
): Promise<PosCartProduct> {
  const normalized = normalizeReferenceProductCode(rawCode)
  if (!normalized) {
    throw new PosLookupError("Product code is required", "INVALID_CODE", 400)
  }

  const product = await db.product.findUnique({
    where: { code: normalized },
    select: {
      id: true,
      code: true,
      name: true,
      productType: true,
      deleted: true,
    },
  })

  if (!product || product.deleted) {
    throw new PosLookupError(
      `Product not found: ${normalized}`,
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
