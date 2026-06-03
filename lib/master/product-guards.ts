import type { PrismaClient } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"

type ProductGuardDb = Pick<PrismaClient, "referenceStock">

export async function assertNoActiveReferencesForProductDelete(
  db: ProductGuardDb,
  productId: string
): Promise<void> {
  const activeCount = await db.referenceStock.count({
    where: { productId, deleted: false },
  })

  if (activeCount > 0) {
    throw new MasterDomainError(
      "Delete or trash ReferenceStock links first",
      "PRODUCT_HAS_ACTIVE_REFERENCE",
      409
    )
  }
}
