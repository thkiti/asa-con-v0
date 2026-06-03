import type { PrismaClient } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"
import { toProductReferenceListItemWithoutReference } from "./product-reference-mapper"
import type { ProductReferenceListItem } from "./types"

type ProductDb = Pick<PrismaClient, "product">

const productSelect = {
  id: true,
  code: true,
  name: true,
  productType: true,
  deleted: true,
} as const

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

  const updated = await db.product.update({
    where: { id },
    data: { deleted: false },
    select: productSelect,
  })

  return toProductReferenceListItemWithoutReference(updated)
}
