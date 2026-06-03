import type { ProductReferenceListItem } from "./types"

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

export function toProductReferenceListItemFromReference(
  ref: ReferenceWithProductRow
): ProductReferenceListItem {
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
