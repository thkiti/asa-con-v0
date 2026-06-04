import { ProductType } from "@/generated/prisma/client"
import { Prisma } from "@/generated/prisma/client"
import {
  lookupPosProductByCode,
  posLookupCodeCandidates,
} from "@/lib/pos/product-search"
import { PosLookupError } from "@/lib/pos/pos-errors"

jest.mock("@/lib/pricing/resolve-pos-retail-price", () => ({
  resolvePosRetailPrice: jest.fn(),
}))

import { resolvePosRetailPrice } from "@/lib/pricing/resolve-pos-retail-price"

const resolveMock = resolvePosRetailPrice as jest.Mock

const trackedProduct = {
  id: "p1",
  code: "0101001",
  name: "Test Shoe size 42",
  productType: ProductType.TRACKED,
  deleted: false,
}

function makeDb(findUniqueImpl: (args: { where: { code: string } }) => unknown) {
  return {
    product: { findUnique: jest.fn(findUniqueImpl) },
    sellingPrice: {},
  }
}

describe("posLookupCodeCandidates", () => {
  it("lists exact input first and normalized only as fallback", () => {
    expect(posLookupCodeCandidates("0101001")).toEqual(["0101001", "0010100"])
    expect(posLookupCodeCandidates("  0101001  ")).toEqual(["0101001", "0010100"])
  })

  it("returns empty candidates for blank input", () => {
    expect(posLookupCodeCandidates("   ")).toEqual([])
  })
})

describe("lookupPosProductByCode", () => {
  beforeEach(() => {
    resolveMock.mockReset()
    resolveMock.mockResolvedValue({
      price: new Prisma.Decimal("125.00"),
      source: "SELLING",
    })
  })

  it("searches exact trimmed code 0101001 before normalized fallback", async () => {
    const findUnique = jest.fn(({ where }: { where: { code: string } }) => {
      if (where.code === "0101001") return Promise.resolve(trackedProduct)
      return Promise.resolve(null)
    })
    const db = makeDb(findUnique)

    const result = await lookupPosProductByCode(db, "0101001")

    expect(findUnique).toHaveBeenNthCalledWith(1, {
      where: { code: "0101001" },
      select: expect.any(Object),
    })
    expect(findUnique).toHaveBeenCalledTimes(1)
    expect(result.code).toBe("0101001")
  })

  it("uses normalized fallback when exact code is missing", async () => {
    const findUnique = jest.fn(({ where }: { where: { code: string } }) => {
      if (where.code === "1010015") return Promise.resolve(null)
      if (where.code === "0101001") return Promise.resolve(trackedProduct)
      return Promise.resolve(null)
    })
    const db = makeDb(findUnique)

    const result = await lookupPosProductByCode(db, "1010015")

    expect(findUnique).toHaveBeenNthCalledWith(1, {
      where: { code: "1010015" },
      select: expect.any(Object),
    })
    expect(findUnique).toHaveBeenNthCalledWith(2, {
      where: { code: "0101001" },
      select: expect.any(Object),
    })
    expect(result.code).toBe("0101001")
  })

  it("error message preserves original user input when not found", async () => {
    const db = makeDb(() => Promise.resolve(null))

    await expect(lookupPosProductByCode(db, "0101001")).rejects.toMatchObject({
      code: "PRODUCT_NOT_FOUND",
      message: "Product not found: 0101001",
    })
    await expect(lookupPosProductByCode(db, "0101001")).rejects.not.toMatchObject({
      message: expect.stringContaining("0010100"),
    })
  })

  it("rejects empty code", async () => {
    const db = makeDb(() => Promise.resolve(null))
    await expect(lookupPosProductByCode(db, "")).rejects.toMatchObject({
      code: "INVALID_CODE",
    })
  })

  it("rejects non-sellable product type", async () => {
    const db = makeDb(() =>
      Promise.resolve({
        ...trackedProduct,
        productType: "SERVICE" as ProductType,
      })
    )
    await expect(lookupPosProductByCode(db, "0101001")).rejects.toMatchObject({
      code: "NOT_SELLABLE",
    })
  })

  it("rejects when no active selling price", async () => {
    const db = makeDb(() => Promise.resolve(trackedProduct))
    resolveMock.mockResolvedValue(null)
    await expect(lookupPosProductByCode(db, "0101001")).rejects.toMatchObject({
      code: "NO_ACTIVE_PRICE",
    })
  })
})
