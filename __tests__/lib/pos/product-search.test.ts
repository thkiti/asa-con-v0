import { ProductType } from "@/generated/prisma/client"
import { Prisma } from "@/generated/prisma/client"
import { lookupPosProductByCode } from "@/lib/pos/product-search"
import { PosLookupError } from "@/lib/pos/pos-errors"

jest.mock("@/lib/pricing/resolve-pos-retail-price", () => ({
  resolvePosRetailPrice: jest.fn(),
}))

import { resolvePosRetailPrice } from "@/lib/pricing/resolve-pos-retail-price"

const resolveMock = resolvePosRetailPrice as jest.Mock

function makeDb(product: unknown) {
  return {
    product: { findUnique: jest.fn().mockResolvedValue(product) },
    sellingPrice: {},
  }
}

describe("lookupPosProductByCode", () => {
  beforeEach(() => {
    resolveMock.mockReset()
  })

  it("returns product with server price when sellable and priced", async () => {
    const db = makeDb({
      id: "p1",
      code: "0101001",
      name: "Test Shoe size 42",
      productType: ProductType.TRACKED,
      deleted: false,
    })
    resolveMock.mockResolvedValue({
      price: new Prisma.Decimal("125.00"),
      source: "SELLING",
    })

    const result = await lookupPosProductByCode(db, "1010015")
    expect(result.productId).toBe("p1")
    expect(result.code).toBe("0101001")
    expect(result.unitPrice).toBe("125.00")
    expect(result.priceSource).toBe("SELLING")
    expect(resolveMock).toHaveBeenCalledWith(db, { productId: "p1" })
  })

  it("rejects empty code", async () => {
    const db = makeDb(null)
    await expect(lookupPosProductByCode(db, "")).rejects.toMatchObject({
      code: "INVALID_CODE",
    })
  })

  it("rejects missing product", async () => {
    const db = makeDb(null)
    await expect(lookupPosProductByCode(db, "1010015")).rejects.toBeInstanceOf(
      PosLookupError
    )
    await expect(lookupPosProductByCode(db, "1010015")).rejects.toMatchObject({
      code: "PRODUCT_NOT_FOUND",
      httpStatus: 404,
    })
  })

  it("rejects non-sellable product type", async () => {
    const db = makeDb({
      id: "p1",
      code: "0101001",
      name: "Svc",
      productType: "SERVICE" as ProductType,
      deleted: false,
    })
    await expect(lookupPosProductByCode(db, "1010015")).rejects.toMatchObject({
      code: "NOT_SELLABLE",
    })
  })

  it("rejects when no active selling price", async () => {
    const db = makeDb({
      id: "p1",
      code: "0101001",
      name: "Unpriced",
      productType: ProductType.TRACKED,
      deleted: false,
    })
    resolveMock.mockResolvedValue(null)
    await expect(lookupPosProductByCode(db, "1010015")).rejects.toMatchObject({
      code: "NO_ACTIVE_PRICE",
    })
  })
})
