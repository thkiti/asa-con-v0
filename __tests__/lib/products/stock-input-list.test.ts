import {
  buildStockInputList,
  computeDisplayCode,
  computeRowKey,
  computeShoeGroupCode,
  dedupeStockInputRows,
  sortStockInputRows,
  type StockInputListRow,
} from "@/lib/products/stock-input-list"

function makeReferenceRow(
  overrides: Partial<StockInputListRow> & Pick<StockInputListRow, "rowKey">
): StockInputListRow {
  return {
    source: "REFERENCE",
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
    ...overrides,
  }
}

describe("stock-input-list pure helpers", () => {
  it("computeShoeGroupCode derives xxxx900 from product code", () => {
    expect(computeShoeGroupCode("5101234")).toBe("5101900")
  })

  it("computeDisplayCode uses product code for S when supplier is dash", () => {
    expect(
      computeDisplayCode({
        hookGroup: "S",
        supplierCode: "-",
        productCode: "5101001",
        refProductCode: "5101001",
      })
    ).toBe("5101001")
  })

  it("computeDisplayCode prefers supplier code for key rows", () => {
    expect(
      computeDisplayCode({
        hookGroup: "K",
        supplierCode: "#ABC",
        productCode: "0101001",
        refProductCode: "0101001",
      })
    ).toBe("#ABC")
  })

  it("computeRowKey uses productId for S and hookNo for keys", () => {
    expect(
      computeRowKey({ hookGroup: "S", hookNo: 3, productId: "p-shoe" })
    ).toBe("S-p-shoe")
    expect(computeRowKey({ hookGroup: "K", hookNo: 12, productId: "p-key" })).toBe(
      "K-12"
    )
  })

  it("dedupeStockInputRows keeps first row per rowKey", () => {
    const reference = makeReferenceRow({
      rowKey: "S-prod-shoe",
      source: "REFERENCE",
      hookGroup: "S",
      hookNo: 2,
      productId: "prod-shoe",
      referenceStockId: "ref-s",
    })
    const shoe = makeReferenceRow({
      rowKey: "S-prod-shoe",
      source: "SHOE",
      hookGroup: "S",
      hookNo: null,
      productId: "prod-shoe",
      referenceStockId: null,
      productCode: "5101001",
    })

    const deduped = dedupeStockInputRows([reference, shoe])
    expect(deduped).toHaveLength(1)
    expect(deduped[0]?.source).toBe("REFERENCE")
    expect(deduped[0]?.referenceStockId).toBe("ref-s")
  })

  it("sortStockInputRows orders by sortKey", () => {
    const rows = [
      makeReferenceRow({
        rowKey: "K-2",
        hookNo: 2,
        sortKey: "0101900|K|000002|#K2|0101002",
        productCode: "0101002",
      }),
      makeReferenceRow({
        rowKey: "K-1",
        hookNo: 1,
        sortKey: "0101900|K|000001|#K1|0101001",
        productCode: "0101001",
      }),
    ]

    const sorted = sortStockInputRows(rows)
    expect(sorted.map((row) => row.rowKey)).toEqual(["K-1", "K-2"])
  })
})

describe("buildStockInputList", () => {
  it("maps reference and shoe rows, dedupes S with reference first, and sorts", async () => {
    const prisma = {
      referenceStock: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "ref-k",
            hookGroup: "K",
            hookNo: 1,
            supplierCode: "#K1",
            productCode: "0101001",
            productGroup: "0101900",
            productId: "prod-key",
            product: { id: "prod-key", code: "0101001", name: "Home Key" },
          },
          {
            id: "ref-s",
            hookGroup: "S",
            hookNo: 4,
            supplierCode: "-",
            productCode: "5101001",
            productGroup: null,
            productId: "prod-shoe",
            product: { id: "prod-shoe", code: "5101001", name: "Heel" },
          },
        ]),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([
          { id: "prod-shoe", code: "5101001", name: "Heel" },
          { id: "prod-sole", code: "5502001", name: "Sole" },
        ]),
      },
    }

    const rows = await buildStockInputList(prisma)

    expect(prisma.referenceStock.findMany).toHaveBeenCalled()
    expect(prisma.product.findMany).toHaveBeenCalled()

    expect(rows).toHaveLength(3)

    const shoeFromRef = rows.find((row) => row.productId === "prod-shoe")
    expect(shoeFromRef).toMatchObject({
      source: "REFERENCE",
      referenceStockId: "ref-s",
      displayCode: "5101001",
      hookLabel: "S.4",
      productGroup: null,
    })

    const sole = rows.find((row) => row.productId === "prod-sole")
    expect(sole).toMatchObject({
      source: "SHOE",
      referenceStockId: null,
      hookNo: null,
      hookLabel: "S",
      productGroup: "5502900",
      groupCode: "5502900",
      displayCode: "5502001",
    })

    const key = rows.find((row) => row.productId === "prod-key")
    expect(key).toMatchObject({
      source: "REFERENCE",
      hookGroup: "K",
      displayCode: "#K1",
    })

    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1]!.sortKey.localeCompare(rows[i]!.sortKey)).toBeLessThanOrEqual(
        0
      )
    }
  })
})
