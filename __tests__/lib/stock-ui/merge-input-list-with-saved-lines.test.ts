import { mergeInputListWithSavedLines } from "@/lib/stock-ui/merge-input-list-with-saved-lines"
import type { StockInputRowVM } from "@/lib/stock-ui/stock-input-list"

const masterRows: StockInputRowVM[] = [
  {
    rowKey: "K-1",
    sourceType: "REFERENCE",
    referenceStockId: "ref-1",
    productId: "prod-1",
    productCode: "0101001",
    productName: "Key A",
    hookGroup: "K",
    hookNo: 1,
    hookLabel: "K.1",
    supplierCode: "#K1",
    displayCode: "#K1",
    displayName: "Key A",
    productGroup: "0101900",
    groupCode: "0101900",
    sortKey: "0101900|K|000001|#K1|0101001",
  },
  {
    rowKey: "K-2",
    sourceType: "REFERENCE",
    referenceStockId: "ref-2",
    productId: "prod-2",
    productCode: "0101002",
    productName: "Key B",
    hookGroup: "K",
    hookNo: 2,
    hookLabel: "K.2",
    supplierCode: "#K2",
    displayCode: "#K2",
    displayName: "Key B",
    productGroup: "0101900",
    groupCode: "0101900",
    sortKey: "0101900|K|000002|#K2|0101002",
  },
]

describe("mergeInputListWithSavedLines", () => {
  it("returns empty qty fields when no saved lines exist", () => {
    const result = mergeInputListWithSavedLines(masterRows, [])

    expect(result.rows).toHaveLength(2)
    expect(result.orphans).toEqual([])
    expect(result.rows[0]).toMatchObject({
      productId: "prod-1",
      qty: "",
      endingQty: "",
      reviewPostingDelta: "",
      isOrphan: false,
    })
  })

  it("overlays saved qty by productId while preserving master order and identity", () => {
    const result = mergeInputListWithSavedLines(masterRows, [
      { productId: "prod-2", qty: 7, endingQty: 10, reviewPostingDelta: 8 },
    ])

    expect(result.rows.map((row) => row.productId)).toEqual(["prod-1", "prod-2"])
    expect(result.rows[0]?.qty).toBe("")
    expect(result.rows[1]).toMatchObject({
      productId: "prod-2",
      productCode: "0101002",
      qty: "7",
      endingQty: "10",
      reviewPostingDelta: "8",
      isOrphan: false,
    })
  })

  it("returns orphan rows for saved lines missing from master", () => {
    const result = mergeInputListWithSavedLines(masterRows, [
      { productId: "missing-prod", qty: 3 },
    ])

    expect(result.rows.every((row) => row.qty === "")).toBe(true)
    expect(result.orphans).toHaveLength(1)
    expect(result.orphans[0]).toMatchObject({
      productId: "missing-prod",
      qty: "3",
      isOrphan: true,
    })
  })

  it("does not mutate input arrays", () => {
    const inputCopy = masterRows.map((row) => ({ ...row }))
    const saved = [{ productId: "prod-1", qty: 2 }]

    mergeInputListWithSavedLines(masterRows, saved)

    expect(masterRows).toEqual(inputCopy)
    expect(saved).toEqual([{ productId: "prod-1", qty: 2 }])
  })
})
