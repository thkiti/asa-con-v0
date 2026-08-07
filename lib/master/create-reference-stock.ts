import type { PrismaClient } from "@/generated/prisma/client"
import { Prisma } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"
import { loadProductForReference } from "./load-product-for-reference"
import type { CreateReferenceStockInput } from "./parse-product-reference-mutation"
import {
  referenceStockSelectWithProduct,
  toProductReferenceListItemFromReference,
} from "./product-reference-mapper"
import type { ProductReferenceListItem } from "./types"

type ReferenceDb = Pick<PrismaClient, "product" | "referenceStock">

/**
 * Create a reference link, or revive an exact soft-deleted
 * (productId, hookGroup, hookNo) row in place.
 */
export async function createReferenceStock(
  db: ReferenceDb,
  input: CreateReferenceStockInput
): Promise<ProductReferenceListItem> {
  await loadProductForReference(db, input.productId)

  const existingRef = await db.referenceStock.findUnique({
    where: {
      productId_hookGroup_hookNo: {
        productId: input.productId,
        hookGroup: input.hookGroup,
        hookNo: input.hookNo,
      },
    },
    select: { id: true, deleted: true },
  })

  if (existingRef) {
    if (!existingRef.deleted) {
      throw new MasterDomainError(
        `Reference hook already exists for this product: ${input.hookGroup}.${input.hookNo}`,
        "HOOK_DUPLICATE",
        409
      )
    }

    const restored = await db.referenceStock.update({
      where: { id: existingRef.id },
      data: {
        supplierCode: input.supplierCode,
        productCode: input.productCode,
        productGroup: input.productGroup,
        deleted: false,
      },
      select: referenceStockSelectWithProduct,
    })
    return toProductReferenceListItemFromReference(restored)
  }

  try {
    const created = await db.referenceStock.create({
      data: {
        productId: input.productId,
        hookGroup: input.hookGroup,
        hookNo: input.hookNo,
        supplierCode: input.supplierCode,
        productCode: input.productCode,
        productGroup: input.productGroup,
        deleted: false,
      },
      select: referenceStockSelectWithProduct,
    })
    return toProductReferenceListItemFromReference(created)
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
