import type { PrismaClient } from "@/generated/prisma/client"
import { Prisma } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"
import type { UpdateReferenceStockInput } from "./parse-product-reference-mutation"
import {
  referenceStockSelectWithProduct,
  toProductReferenceListItemFromReference,
} from "./product-reference-mapper"
import {
  assertActiveHookAvailable,
  assertActiveSupplierAvailable,
} from "./reference-uniqueness"
import type { ProductReferenceListItem } from "./types"

type ReferenceDb = Pick<PrismaClient, "referenceStock">

/**
 * Update an existing reference. Residual soft-deleted unique-key orphans are
 * hard-deleted so the active edit can move onto the key.
 */
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

  await assertActiveHookAvailable(db, {
    hookGroup: input.hookGroup,
    hookNo: input.hookNo,
    productId: existing.productId,
    excludeReferenceId: existing.id,
  })
  await assertActiveSupplierAvailable(db, {
    supplierCode: input.supplierCode,
    productId: existing.productId,
    excludeReferenceId: existing.id,
  })

  const conflict = await db.referenceStock.findUnique({
    where: {
      productId_hookGroup_hookNo: {
        productId: existing.productId,
        hookGroup: input.hookGroup,
        hookNo: input.hookNo,
      },
    },
    select: { id: true, deleted: true },
  })

  if (conflict && conflict.id !== existing.id) {
    if (conflict.deleted) {
      await db.referenceStock.delete({ where: { id: conflict.id } })
    } else {
      throw new MasterDomainError(
        `Reference hook already exists for this product: ${input.hookGroup}.${input.hookNo}`,
        "HOOK_DUPLICATE",
        409
      )
    }
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
