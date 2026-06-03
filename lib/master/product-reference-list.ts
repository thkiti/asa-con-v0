import type { PrismaClient } from "@/generated/prisma/client"
import { applyProductReferenceFilters } from "./filters/product-reference-list"
import type {
  ProductReferenceListItem,
  ProductReferenceListQuery,
} from "./types"

type ProductReferenceDb = Pick<PrismaClient, "product" | "referenceStock">

type ReferenceWithProduct = {
  id: string
  hookGroup: string
  hookNo: number
  supplierCode: string
  productCode: string
  productGroup: string | null
  productId: string
  deleted: boolean
  product: {
    id: string
    code: string
    name: string
    productType: ProductReferenceListItem["productType"]
    deleted: boolean
  }
}

function sortReferences(refs: ReferenceWithProduct[]): ReferenceWithProduct[] {
  return [...refs].sort((a, b) => {
    const g = a.hookGroup.localeCompare(b.hookGroup)
    if (g !== 0) return g
    if (a.hookNo !== b.hookNo) return a.hookNo - b.hookNo
    return a.supplierCode.localeCompare(b.supplierCode)
  })
}

function mapReferenceRow(ref: ReferenceWithProduct): ProductReferenceListItem {
  return {
    rowId: ref.id,
    productId: ref.productId,
    productCode: ref.product.code,
    productName: ref.product.name,
    productType: ref.product.productType,
    hookGroup: ref.hookGroup,
    hookNo: ref.hookNo,
    supplierCode: ref.supplierCode,
    productGroup: ref.productGroup,
    referenceProductCode: ref.productCode,
    hasReference: true,
    deleted: ref.deleted,
  }
}

function mapProductWithoutReference(
  product: {
    id: string
    code: string
    name: string
    productType: ProductReferenceListItem["productType"]
    deleted: boolean
  }
): ProductReferenceListItem {
  return {
    rowId: `product-${product.id}`,
    productId: product.id,
    productCode: product.code,
    productName: product.name,
    productType: product.productType,
    hookGroup: "",
    hookNo: null,
    supplierCode: "",
    productGroup: null,
    referenceProductCode: "",
    hasReference: false,
    deleted: product.deleted,
  }
}

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

  const refsByProductId = new Map<string, ReferenceWithProduct[]>()
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
      return mapReferenceRow(primary)
    }
    return mapProductWithoutReference(product)
  })

  return applyProductReferenceFilters(rows, query)
}
