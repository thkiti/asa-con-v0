import { matchCatalogProductCode } from "@/lib/catalog-image/match-product"

describe("matchCatalogProductCode", () => {
  const createMock = () => {
    const findUnique = jest.fn()
    const db = {
      product: {
        findUnique,
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
    }
    return { db, findUnique }
  }

  it("returns MATCHED when product exists", async () => {
    const { db, findUnique } = createMock()
    findUnique.mockResolvedValue({ id: "prod-1" })

    const result = await matchCatalogProductCode(db, "1010152")

    expect(result).toEqual({
      rawCode: "1010152",
      productCode: "0101015",
      status: "MATCHED",
      productId: "prod-1",
    })
    expect(findUnique).toHaveBeenCalledWith({
      where: { code: "0101015" },
      select: { id: true },
    })
    expect(db.product.create).not.toHaveBeenCalled()
    expect(db.product.update).not.toHaveBeenCalled()
    expect(db.product.upsert).not.toHaveBeenCalled()
  })

  it("returns UNMATCHED when product not found", async () => {
    const { db, findUnique } = createMock()
    findUnique.mockResolvedValue(null)

    const result = await matchCatalogProductCode(db, "1010152")

    expect(result.status).toBe("UNMATCHED")
    expect(result.productCode).toBe("0101015")
    expect(result.productId).toBeNull()
    expect(db.product.create).not.toHaveBeenCalled()
  })

  it("returns INVALID for bad codes without querying product", async () => {
    const { db, findUnique } = createMock()

    const result = await matchCatalogProductCode(db, "1")

    expect(result.status).toBe("INVALID")
    expect(result.productCode).toBeNull()
    expect(findUnique).not.toHaveBeenCalled()
    expect(db.product.create).not.toHaveBeenCalled()
  })
})
