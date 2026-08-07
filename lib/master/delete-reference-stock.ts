import type { PrismaClient } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"
import { toProductReferenceListItemWithoutReference } from "./product-reference-mapper"
import type { ProductReferenceListItem } from "./types"

type ReferenceDb = Pick<PrismaClient, "referenceStock">

/**
 * Trash Reference Link: hard-delete the ReferenceStock row.
 * Product stays unchanged; the hook slot is released immediately.
 */
export async function deleteReferenceStock(
  db: ReferenceDb,
  id: string
): Promise<ProductReferenceListItem> {
  const existing = await db.referenceStock.findUnique({
    where: { id },
    select: {
      id: true,
      product: {
        select: {
          id: true,
          code: true,
          name: true,
          productType: true,
          deleted: true,
        },
      },
    },
  })

  if (!existing) {
    throw new MasterDomainError("Reference not found", "REFERENCE_NOT_FOUND", 404)
  }

  await db.referenceStock.delete({ where: { id } })

  return toProductReferenceListItemWithoutReference(existing.product)
}
