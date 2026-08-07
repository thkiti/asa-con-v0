import type { ProductReferenceLink, ProductReferenceListItem } from "./types"

export type ReferenceWithProductRow = {
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

export type ProductRowForList = {
  id: string
  code: string
  name: string
  productType: ProductReferenceListItem["productType"]
  deleted: boolean
}

export function sortReferences<T extends { hookGroup: string; hookNo: number; supplierCode: string }>(
  refs: T[]
): T[] {
  return [...refs].sort((a, b) => {
    const g = a.hookGroup.localeCompare(b.hookGroup)
    if (g !== 0) return g
    if (a.hookNo !== b.hookNo) return a.hookNo - b.hookNo
    return a.supplierCode.localeCompare(b.supplierCode)
  })
}

export function toProductReferenceLink(
  ref: Pick<
    ReferenceWithProductRow,
    "id" | "hookGroup" | "hookNo" | "supplierCode" | "productGroup" | "productCode"
  >
): ProductReferenceLink {
  return {
    id: ref.id,
    hookGroup: ref.hookGroup,
    hookNo: ref.hookNo,
    supplierCode: ref.supplierCode,
    productGroup: ref.productGroup,
    productCode: ref.productCode,
  }
}

export function toProductReferenceListItemFromReferences(
  product: ProductRowForList,
  refs: ReferenceWithProductRow[]
): ProductReferenceListItem {
  const sorted = sortReferences(refs)
  const links = sorted.map(toProductReferenceLink)
  const primary = sorted[0]

  if (!primary) {
    return toProductReferenceListItemWithoutReference(product)
  }

  return {
    rowId: primary.id,
    productId: product.id,
    productCode: product.code,
    productName: product.name,
    productType: product.productType,
    hookGroup: primary.hookGroup,
    hookNo: primary.hookNo,
    supplierCode: primary.supplierCode,
    productGroup: primary.productGroup,
    referenceProductCode: primary.productCode,
    hasReference: true,
    references: links,
    referenceCount: links.length,
    deleted: product.deleted,
  }
}

export function toProductReferenceListItemFromReference(
  ref: ReferenceWithProductRow
): ProductReferenceListItem {
  return toProductReferenceListItemFromReferences(ref.product, [ref])
}

export function toProductReferenceListItemWithoutReference(
  product: ProductRowForList
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
    references: [],
    referenceCount: 0,
    deleted: product.deleted,
  }
}

export const referenceStockSelectWithProduct = {
  id: true,
  hookGroup: true,
  hookNo: true,
  supplierCode: true,
  productCode: true,
  productGroup: true,
  productId: true,
  deleted: true,
  product: {
    select: {
      id: true,
      code: true,
      name: true,
      productType: true,
      deleted: true,
    },
  },
} as const
