import {
  applyProductReferenceFilters,
  matchesHookGroup,
  matchesHookNo,
  matchesProductCode,
  matchesProductName,
  orderProductReferenceList,
} from "@/lib/master/filters/product-reference-list"
import type { ProductReferenceListItem } from "@/lib/master/types"
import { ProductType } from "@/lib/shared/types"

function row(
  overrides: Partial<ProductReferenceListItem> = {}
): ProductReferenceListItem {
  return {
    rowId: "r1",
    productId: "p1",
    productCode: "5101001",
    productName: "Widget Alpha",
    productType: ProductType.TRACKED,
    hookGroup: "K",
    hookNo: 12,
    supplierCode: "SUP01",
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

describe("matchesProductCode", () => {
  it('prefix "5" matches 5101001', () => {
    expect(matchesProductCode(row(), "5")).toBe(true)
  })

  it('prefix "5" does not match 0101051', () => {
    expect(matchesProductCode(row({ productCode: "0101051" }), "5")).toBe(false)
  })

  it('prefix "5101" matches codes starting with 5101 only', () => {
    expect(matchesProductCode(row(), "5101")).toBe(true)
    expect(matchesProductCode(row({ productCode: "5101999" }), "5101")).toBe(true)
    expect(matchesProductCode(row({ productCode: "5102001" }), "5101")).toBe(false)
    expect(matchesProductCode(row({ productCode: "6101001" }), "5101")).toBe(false)
  })
})

describe("matchesHookGroup", () => {
  it('exact "K" matches K only', () => {
    expect(matchesHookGroup(row(), "K")).toBe(true)
    expect(matchesHookGroup(row(), "k")).toBe(true)
    expect(matchesHookGroup(row({ hookGroup: "G" }), "K")).toBe(false)
  })
})

describe("matchesHookNo", () => {
  it('exact "12" matches hookNo 12 only', () => {
    expect(matchesHookNo(row(), "12")).toBe(true)
    expect(matchesHookNo(row({ hookNo: 120 }), "12")).toBe(false)
    expect(matchesHookNo(row({ hookNo: 1 }), "12")).toBe(false)
  })
})

describe("matchesProductName", () => {
  it("uses contains for name", () => {
    expect(matchesProductName(row(), "alpha")).toBe(true)
    expect(matchesProductName(row(), "wid")).toBe(true)
    expect(matchesProductName(row(), "zzz")).toBe(false)
  })
})

describe("applyProductReferenceFilters", () => {
  const rows = [
    row(),
    row({
      rowId: "product-p2",
      productId: "p2",
      productCode: "0101051",
      productName: "Other",
      hookGroup: "G",
      hookNo: 1,
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

  it("filters by product code prefix", () => {
    const result = applyProductReferenceFilters(rows, {
      ...baseQuery,
      productCode: "5101",
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.productCode).toBe("5101001")
  })

  it('productCode "5" excludes 0101051', () => {
    const result = applyProductReferenceFilters(rows, {
      ...baseQuery,
      productCode: "5",
    })
    expect(result.map((r) => r.productCode)).toEqual(["5101001"])
  })

  it("filters by product name contains", () => {
    const result = applyProductReferenceFilters(rows, {
      ...baseQuery,
      productName: "Other",
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.productName).toBe("Other")
  })

  it("filters by exact hook group and hook no", () => {
    const result = applyProductReferenceFilters(rows, {
      ...baseQuery,
      hookGroup: "K",
      hookNo: "12",
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.hookGroup).toBe("K")
    expect(result[0]?.hookNo).toBe(12)
  })
})

describe("orderProductReferenceList", () => {
  const lexicalTrapRows = [
    row({
      rowId: "c10",
      productId: "p10",
      productCode: "100",
      hookGroup: "C",
      hookNo: 10,
    }),
    row({
      rowId: "c128",
      productId: "p128",
      productCode: "200",
      hookGroup: "C",
      hookNo: 128,
    }),
    row({
      rowId: "c1",
      productId: "p1",
      productCode: "900",
      hookGroup: "C",
      hookNo: 1,
    }),
    row({
      rowId: "c2",
      productId: "p2",
      productCode: "800",
      hookGroup: "C",
      hookNo: 2,
    }),
    row({
      rowId: "c9",
      productId: "p9",
      productCode: "050",
      hookGroup: "C",
      hookNo: 9,
    }),
    row({
      rowId: "c68",
      productId: "p68",
      productCode: "300",
      hookGroup: "C",
      hookNo: 68,
    }),
  ]

  it("orders by numeric hookNo when hook group is selected (not lexical)", () => {
    const ordered = orderProductReferenceList(lexicalTrapRows, {
      ...baseQuery,
      hookGroup: "C",
    })
    expect(ordered.map((r) => `${r.hookGroup}.${r.hookNo}`)).toEqual([
      "C.1",
      "C.2",
      "C.9",
      "C.10",
      "C.68",
      "C.128",
    ])
  })

  it("keeps Hook as order key when Hook is combined with other filters", () => {
    const ordered = orderProductReferenceList(lexicalTrapRows, {
      ...baseQuery,
      hookGroup: "C",
      productCode: "0",
    })
    expect(ordered.map((r) => r.hookNo)).toEqual([1, 2, 9, 10, 68, 128])
  })

  it("does not secondary-sort by productCode for equal hooks", () => {
    const rows = [
      row({
        rowId: "a",
        productId: "pa",
        productCode: "999",
        hookGroup: "C",
        hookNo: 5,
      }),
      row({
        rowId: "b",
        productId: "pb",
        productCode: "001",
        hookGroup: "C",
        hookNo: 5,
      }),
    ]
    const ordered = orderProductReferenceList(rows, {
      ...baseQuery,
      hookGroup: "C",
    })
    expect(ordered.map((r) => r.rowId)).toEqual(["a", "b"])
  })

  it("preserves Product Code order when no Hook filter is selected", () => {
    const byProductCode = [
      row({
        rowId: "low",
        productId: "p-low",
        productCode: "100",
        hookGroup: "C",
        hookNo: 50,
      }),
      row({
        rowId: "high",
        productId: "p-high",
        productCode: "900",
        hookGroup: "C",
        hookNo: 1,
      }),
    ]
    const ordered = orderProductReferenceList(byProductCode, baseQuery)
    expect(ordered.map((r) => r.rowId)).toEqual(["low", "high"])
  })

  it("preserves Product Code order when only productCode is entered", () => {
    const byProductCode = [
      row({
        rowId: "a",
        productId: "pa",
        productCode: "5101001",
        hookGroup: "C",
        hookNo: 20,
      }),
      row({
        rowId: "b",
        productId: "pb",
        productCode: "5101002",
        hookGroup: "C",
        hookNo: 3,
      }),
    ]
    const ordered = orderProductReferenceList(byProductCode, {
      ...baseQuery,
      productCode: "5101",
    })
    expect(ordered.map((r) => r.productCode)).toEqual(["5101001", "5101002"])
  })
})
