import type { PrismaClient } from "@/generated/prisma/client"
import { applyProductReferenceFilters } from "./filters/product-reference-list"
import {
  sortReferences,
  toProductReferenceListItemFromReference,
  toProductReferenceListItemWithoutReference,
} from "./product-reference-mapper"
import type {
  ProductReferenceListItem,
  ProductReferenceListQuery,
} from "./types"

type ProductReferenceDb = Pick<PrismaClient, "product" | "referenceStock">

export async function listProductReference(
  db: ProductReferenceDb,
  query: ProductReferenceListQuery
): Promise<ProductReferenceListItem[]> {
  const deleted = query.mode === "trash"

  const [products, refs] = await Promise.all([
    db.product.findMany({
      where: { deleted },
      select: {
        id: true,
        code: true,
        name: true,
        productType: true,
        deleted: true,
      },
      orderBy: { code: "asc" },
    }),
    db.referenceStock.findMany({
      where: { deleted },
      include: {
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
    }),
  ])

  const refsByProductId = new Map<string, typeof refs>()
  for (const ref of refs) {
    const list = refsByProductId.get(ref.productId) ?? []
    list.push(ref)
    refsByProductId.set(ref.productId, list)
  }

  for (const [productId, list] of refsByProductId) {
    refsByProductId.set(productId, sortReferences(list))
  }

  const rows: ProductReferenceListItem[] = products.map((product) => {
    const list = refsByProductId.get(product.id)
    const primary = list?.[0]
    if (primary) {
      return toProductReferenceListItemFromReference(primary)
    }
    return toProductReferenceListItemWithoutReference(product)
  })

  return applyProductReferenceFilters(rows, query)
}
