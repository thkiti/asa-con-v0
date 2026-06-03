import type { PrismaClient } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"
import type { ProductRowForList } from "./product-reference-mapper"

type ProductDb = Pick<PrismaClient, "product">

export async function loadProductForReference(
  db: ProductDb,
  productId: string
): Promise<ProductRowForList> {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      code: true,
      name: true,
      productType: true,
      deleted: true,
    },
  })

  if (!product) {
    throw new MasterDomainError("Product not found", "PRODUCT_NOT_FOUND", 404)
  }

  if (product.deleted) {
    throw new MasterDomainError(
      "Product is deleted and cannot be linked",
      "PRODUCT_NOT_ASSIGNABLE",
      400
    )
  }

  return product
}
