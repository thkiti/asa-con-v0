import type { PrismaClient } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"
import {
  referenceStockSelectWithProduct,
  sortReferences,
  toProductReferenceListItemFromReference,
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
 * Restore Product and all of its soft-deleted ReferenceStock rows.
 * Keeps active Products from retaining invisible deleted refs that block unique keys.
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

    await tx.referenceStock.updateMany({
      where: { productId: id, deleted: true },
      data: { deleted: false },
    })

    const refs = await tx.referenceStock.findMany({
      where: { productId: id, deleted: false },
      select: referenceStockSelectWithProduct,
    })
    const primary = sortReferences(refs)[0]
    if (primary) {
      return toProductReferenceListItemFromReference(primary)
    }
    return toProductReferenceListItemWithoutReference(updated)
  })
}
