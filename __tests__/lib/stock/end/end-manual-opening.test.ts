import { resolveEndManualOpeningLines } from "@/lib/stock/end/end-manual-opening"
import { EndError, EndErrorCodes } from "@/lib/stock/end/end-errors"

describe("resolveEndManualOpeningLines", () => {
  const db = {
    stockDocument: {
      findUnique: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    db.product.findMany.mockResolvedValue([
      { id: "p1", code: "SKU-1" },
      { id: "p2", code: "SKU-2" },
    ])
  })

  it("resolves product codes for 2026-01 END", async () => {
    db.stockDocument.findUnique.mockResolvedValue({
      id: "end-1",
      docType: "END",
      endStatus: "DRAFT",
      periodMonth: "2026-01",
      endLines: [],
    })

    const result = await resolveEndManualOpeningLines(
      "end-1",
      [{ productCode: "sku-1", beginQty: 10, countQty: 12 }],
      db as never
    )

    expect(result.errors).toEqual([])
    expect(result.rows).toEqual([
      expect.objectContaining({
        productCode: "SKU-1",
        productId: "p1",
        beginQty: 10,
        countQty: 12,
      }),
    ])
  })

  it("rejects unknown product codes", async () => {
    db.stockDocument.findUnique.mockResolvedValue({
      id: "end-1",
      docType: "END",
      endStatus: "DRAFT",
      periodMonth: "2026-01",
      endLines: [],
    })

    const result = await resolveEndManualOpeningLines(
      "end-1",
      [{ productCode: "NOPE", beginQty: 1 }],
      db as never
    )

    expect(result.errors[0]).toMatchObject({
      productCode: "NOPE",
      message: "Product Code not found",
    })
    expect(result.rows).toHaveLength(0)
  })

  it("rejects non-initial period", async () => {
    db.stockDocument.findUnique.mockResolvedValue({
      id: "end-2",
      docType: "END",
      endStatus: "DRAFT",
      periodMonth: "2026-02",
      endLines: [],
    })

    await expect(
      resolveEndManualOpeningLines(
        "end-2",
        [{ productCode: "SKU-1", beginQty: 1 }],
        db as never
      )
    ).rejects.toMatchObject({
      code: EndErrorCodes.IMPORT_NOT_ALLOWED,
    })
  })

  it("rejects locked END", async () => {
    db.stockDocument.findUnique.mockResolvedValue({
      id: "end-1",
      docType: "END",
      endStatus: "LOCKED",
      periodMonth: "2026-01",
      endLines: [],
    })

    await expect(
      resolveEndManualOpeningLines(
        "end-1",
        [{ productCode: "SKU-1", beginQty: 1 }],
        db as never
      )
    ).rejects.toBeInstanceOf(EndError)
  })
})
