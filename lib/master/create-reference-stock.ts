import type { PrismaClient } from "@/generated/prisma/client"
import { Prisma } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"
import { loadProductForReference } from "./load-product-for-reference"
import type { CreateReferenceStockInput } from "./parse-product-reference-mutation"
import {
  referenceStockSelectWithProduct,
  toProductReferenceListItemFromReference,
} from "./product-reference-mapper"
import {
  assertActiveHookAvailable,
  assertActiveSupplierAvailable,
} from "./reference-uniqueness"
import type { ProductReferenceListItem } from "./types"

type ReferenceDb = Pick<PrismaClient, "product" | "referenceStock">

/**
 * Create a current Product ↔ Hook reference link.
 * Residual soft-deleted unique-key orphans are hard-deleted so the slot is reusable.
 */
export async function createReferenceStock(
  db: ReferenceDb,
  input: CreateReferenceStockInput
): Promise<ProductReferenceListItem> {
  await loadProductForReference(db, input.productId)

  await assertActiveHookAvailable(db, {
    hookGroup: input.hookGroup,
    hookNo: input.hookNo,
    productId: input.productId,
  })
  await assertActiveSupplierAvailable(db, {
    supplierCode: input.supplierCode,
    productId: input.productId,
  })

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
    await db.referenceStock.delete({ where: { id: existingRef.id } })
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
