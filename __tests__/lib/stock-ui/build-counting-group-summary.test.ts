import {
  buildStockDocumentGroupSummary,
  COUNTING_GROUP_SUMMARY_UNGROUPED_LABEL,
  hasCountedQty,
  STOCK_DOCUMENT_GROUP_SUMMARY_TOTAL_LABEL,
  sumStockDocumentGroupSummaryRows,
} from "@/lib/stock-ui/build-counting-group-summary"

describe("hasCountedQty", () => {
  it("returns false for empty, blank, and zero", () => {
    expect(hasCountedQty("")).toBe(false)
    expect(hasCountedQty("   ")).toBe(false)
    expect(hasCountedQty("0")).toBe(false)
  })

  it("returns true for positive and negative qty", () => {
    expect(hasCountedQty("5")).toBe(true)
    expect(hasCountedQty("-3")).toBe(true)
  })
})

describe("buildStockDocumentGroupSummary", () => {
  it("returns empty array for no lines", () => {
    expect(buildStockDocumentGroupSummary([])).toEqual([])
  })

  it("counts items and sums qty only for filled non-zero lines", () => {
    const summary = buildStockDocumentGroupSummary([
      { productGroup: "0101900", productName: "Key A", qty: "2" },
      { productGroup: "0101900", productName: "Key B", qty: "3" },
      { productGroup: "0101900", productName: "Key C", qty: "" },
      { productGroup: "0101900", productName: "Key D", qty: "0" },
      { productGroup: "0201900", productName: "Other", qty: "1" },
      { productGroup: "0201900", productName: "Skip", qty: "" },
    ])

    expect(summary).toEqual([
      {
        productGroup: "0101900",
        name: "Key A",
        items: 2,
        totalQty: 5,
      },
      {
        productGroup: "0201900",
        name: "Other",
        items: 1,
        totalQty: 1,
      },
    ])
  })

  it("includes negative qty in items and total", () => {
    const summary = buildStockDocumentGroupSummary([
      { productGroup: "G1", productName: "Adj", qty: "-2" },
    ])

    expect(summary[0]).toMatchObject({ items: 1, totalQty: -2 })
  })

  it("buckets null productGroup under Thai ungrouped label", () => {
    const summary = buildStockDocumentGroupSummary([
      { productGroup: null, productName: "X", qty: "1" },
      { productGroup: "", productName: "Y", qty: "" },
    ])

    expect(summary).toEqual([
      {
        productGroup: COUNTING_GROUP_SUMMARY_UNGROUPED_LABEL,
        name: "X",
        items: 1,
        totalQty: 1,
      },
    ])
  })

  it("sumStockDocumentGroupSummaryRows totals only counted groups", () => {
    const rows = buildStockDocumentGroupSummary([
      { productGroup: "5101900", productName: "A", qty: "10" },
      { productGroup: "5101900", productName: "B", qty: "5" },
      { productGroup: "5102900", productName: "C", qty: "3" },
      { productGroup: "5103900", productName: "D", qty: "" },
    ])

    expect(sumStockDocumentGroupSummaryRows(rows)).toEqual({
      items: 3,
      totalQty: 18,
    })
    expect(STOCK_DOCUMENT_GROUP_SUMMARY_TOTAL_LABEL).toBe("TOTAL")
  })

  it("sorts groups by productGroup key", () => {
    const summary = buildStockDocumentGroupSummary([
      { productGroup: "Z", productName: "Z", qty: "1" },
      { productGroup: "A", productName: "A", qty: "1" },
    ])

    expect(summary.map((row) => row.productGroup)).toEqual(["A", "Z"])
  })
})
