import type { PrismaClient } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"
import { loadProductForReference } from "./load-product-for-reference"
import {
  referenceStockSelectWithProduct,
  toProductReferenceListItemFromReference,
} from "./product-reference-mapper"
import type { ProductReferenceListItem } from "./types"

type ReferenceDb = Pick<PrismaClient, "product" | "referenceStock">

export async function restoreReferenceStock(
  db: ReferenceDb,
  id: string
): Promise<ProductReferenceListItem> {
  const existing = await db.referenceStock.findUnique({
    where: { id },
    select: { id: true, productId: true },
  })

  if (!existing) {
    throw new MasterDomainError("Reference not found", "REFERENCE_NOT_FOUND", 404)
  }

  await loadProductForReference(db, existing.productId)

  const updated = await db.referenceStock.update({
    where: { id },
    data: { deleted: false },
    select: referenceStockSelectWithProduct,
  })

  return toProductReferenceListItemFromReference(updated)
}
