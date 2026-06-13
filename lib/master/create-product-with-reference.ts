import type { PrismaClient } from "@/generated/prisma/client"
import { Prisma } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"
import type { CreateProductWithReferenceInput } from "./parse-product-create-mutation"
import {
  referenceStockSelectWithProduct,
  toProductReferenceListItemFromReference,
} from "./product-reference-mapper"
import type { ProductReferenceListItem } from "./types"

type CreateDb = Pick<PrismaClient, "product" | "referenceStock" | "$transaction">

export async function createProductWithReference(
  db: CreateDb,
  input: CreateProductWithReferenceInput
): Promise<ProductReferenceListItem> {
  return db.$transaction(async (tx) => {
    const existingProduct = await tx.product.findUnique({
      where: { code: input.productCode },
      select: { id: true },
    })

    const productId = existingProduct
      ? (
          await tx.product.update({
            where: { id: existingProduct.id },
            data: {
              name: input.name.trim(),
              productType: input.productType,
              deleted: false,
            },
            select: { id: true },
          })
        ).id
      : (
          await tx.product.create({
            data: {
              code: input.productCode,
              groupCode: input.groupCode,
              typeCode: input.typeCode,
              runningCode: input.runningCode,
              name: input.name.trim(),
              productType: input.productType,
              deleted: false,
            },
            select: { id: true },
          })
        ).id

    const existingRef = await tx.referenceStock.findUnique({
      where: {
        productId_hookGroup_hookNo: {
          productId,
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

      const restored = await tx.referenceStock.update({
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
      const created = await tx.referenceStock.create({
        data: {
          productId,
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
  })
}
