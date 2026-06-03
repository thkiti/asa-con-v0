import { applyProductReferenceFilters } from "@/lib/master/filters/product-reference-list"
import type { ProductReferenceListItem } from "@/lib/master/types"
import { ProductType } from "@/lib/shared"

function row(
  overrides: Partial<ProductReferenceListItem> = {}
): ProductReferenceListItem {
  return {
    rowId: "r1",
    productId: "p1",
    productCode: "5101001",
    productName: "Widget",
    productType: ProductType.TRACKED,
    hookGroup: "G",
    hookNo: 1,
    supplierCode: "SUP",
    productGroup: "5101900",
    referenceProductCode: "5101001",
    hasReference: true,
    deleted: false,
    ...overrides,
  }
}

const baseQuery = {
  mode: "active" as const,
  productCode: "",
  productName: "",
  hookGroup: "",
  hookNo: "",
  supplierCode: "",
  productGroup: "",
  referenceStatus: "all" as const,
}

describe("applyProductReferenceFilters", () => {
  const rows = [
    row(),
    row({
      rowId: "product-p2",
      productId: "p2",
      productCode: "6101001",
      productName: "Other",
      hookGroup: "",
      hookNo: null,
      supplierCode: "",
      productGroup: null,
      referenceProductCode: "",
      hasReference: false,
    }),
  ]

  it("filters by reference status has", () => {
    const result = applyProductReferenceFilters(rows, {
      ...baseQuery,
      referenceStatus: "has",
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.hasReference).toBe(true)
  })

  it("filters by reference status none", () => {
    const result = applyProductReferenceFilters(rows, {
      ...baseQuery,
      referenceStatus: "none",
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.hasReference).toBe(false)
  })

  it("filters by product code", () => {
    const result = applyProductReferenceFilters(rows, {
      ...baseQuery,
      productCode: "610",
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.productCode).toBe("6101001")
  })
})
