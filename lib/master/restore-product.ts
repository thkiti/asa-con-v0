import type { PrismaClient } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"
import {
  referenceStockSelectWithProduct,
  toProductReferenceListItemFromReferences,
  toProductReferenceListItemWithoutReference,
} from "./product-reference-mapper"
import type { ProductReferenceListItem } from "./types"

type ProductDb = Pick<PrismaClient, "product" | "referenceStock" | "$transaction">

const productSelect = {
  id: true,
  code: true,
  name: true,
  productType: true,
  deleted: true,
} as const

/**
 * Restore Product identity only. Does not recreate ReferenceStock —
 * product may return hook-less and receive a new current reference later.
 */
export async function restoreProduct(
  db: ProductDb,
  id: string
): Promise<ProductReferenceListItem> {
  const existing = await db.product.findUnique({
    where: { id },
    select: productSelect,
  })

  if (!existing) {
    throw new MasterDomainError("Product not found", "PRODUCT_NOT_FOUND", 404)
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id },
      data: { deleted: false },
      select: productSelect,
    })

    const refs = await tx.referenceStock.findMany({
      where: { productId: id, deleted: false },
      select: referenceStockSelectWithProduct,
    })
    if (refs.length > 0) {
      return toProductReferenceListItemFromReferences(updated, refs)
    }
    return toProductReferenceListItemWithoutReference(updated)
  })
}
