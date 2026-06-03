import type { PrismaClient } from "@/generated/prisma/client"
import { Prisma } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"
import type { UpdateReferenceStockInput } from "./parse-product-reference-mutation"
import {
  referenceStockSelectWithProduct,
  toProductReferenceListItemFromReference,
} from "./product-reference-mapper"
import type { ProductReferenceListItem } from "./types"

type ReferenceDb = Pick<PrismaClient, "referenceStock">

export async function updateReferenceStock(
  db: ReferenceDb,
  id: string,
  input: UpdateReferenceStockInput
): Promise<ProductReferenceListItem> {
  const existing = await db.referenceStock.findUnique({
    where: { id },
    select: { id: true, productId: true },
  })

  if (!existing) {
    throw new MasterDomainError("Reference not found", "REFERENCE_NOT_FOUND", 404)
  }

  try {
    const updated = await db.referenceStock.update({
      where: { id },
      data: {
        hookGroup: input.hookGroup,
        hookNo: input.hookNo,
        supplierCode: input.supplierCode,
        productCode: input.productCode,
        productGroup: input.productGroup,
      },
      select: referenceStockSelectWithProduct,
    })
    return toProductReferenceListItemFromReference(updated)
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new MasterDomainError(
        `Reference hook already exists for this product: ${input.hookGroup}.${input.hookNo}`,
        "HOOK_DUPLICATE",
        409
      )
    }
    throw err
  }
}
