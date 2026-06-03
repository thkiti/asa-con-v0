import type { PrismaClient } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"
import {
  referenceStockSelectWithProduct,
  toProductReferenceListItemFromReference,
} from "./product-reference-mapper"
import type { ProductReferenceListItem } from "./types"

type ReferenceDb = Pick<PrismaClient, "referenceStock">

export async function deleteReferenceStock(
  db: ReferenceDb,
  id: string
): Promise<ProductReferenceListItem> {
  const existing = await db.referenceStock.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!existing) {
    throw new MasterDomainError("Reference not found", "REFERENCE_NOT_FOUND", 404)
  }

  const updated = await db.referenceStock.update({
    where: { id },
    data: { deleted: true },
    select: referenceStockSelectWithProduct,
  })

  return toProductReferenceListItemFromReference(updated)
}
