import {
  normalizeStockInputList,
  normalizeStockInputRow,
  type StockInputRowVM,
} from "@/lib/stock-ui/stock-input-list"

const sampleRow = {
  rowKey: "K-1",
  source: "REFERENCE",
  referenceStockId: "ref-1",
  productId: "prod-1",
  productCode: "0101001",
  productName: "Key",
  hookGroup: "K",
  hookNo: 1,
  hookLabel: "K.1",
  supplierCode: "#K1",
  displayCode: "#K1",
  displayName: "Key",
  productGroup: "0101900",
  groupCode: "0101900",
  sortKey: "0101900|K|000001|#K1|0101001",
}

describe("stock-ui stock-input-list", () => {
  it("normalizeStockInputRow maps server source to sourceType", () => {
    const row = normalizeStockInputRow(sampleRow)
    expect(row).toEqual({
      rowKey: "K-1",
      sourceType: "REFERENCE",
      referenceStockId: "ref-1",
      productId: "prod-1",
      productCode: "0101001",
      productName: "Key",
      hookGroup: "K",
      hookNo: 1,
      hookLabel: "K.1",
      supplierCode: "#K1",
      displayCode: "#K1",
      displayName: "Key",
      productGroup: "0101900",
      groupCode: "0101900",
      sortKey: "0101900|K|000001|#K1|0101001",
    } satisfies StockInputRowVM)
  })

  it("normalizeStockInputList parses arrays", () => {
    expect(normalizeStockInputList([sampleRow])).toHaveLength(1)
  })

  it("normalizeStockInputList rejects non-array payloads", () => {
    expect(() => normalizeStockInputList({ rows: [] })).toThrow(
      "Stock input list must be an array"
    )
  })
})
