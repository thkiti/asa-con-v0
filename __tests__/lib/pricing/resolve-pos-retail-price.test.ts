import { Prisma } from "@/generated/prisma/client"
import { resolvePosRetailPrice } from "@/lib/pricing/resolve-pos-retail-price"

describe("resolvePosRetailPrice", () => {
  it("returns active selling price with SELLING source", async () => {
    const db = {
      sellingPrice: {
        findFirst: jest.fn().mockResolvedValue({
          price: new Prisma.Decimal("99.50"),
        }),
      },
    }

    const result = await resolvePosRetailPrice(db, { productId: "p1" })
    expect(result?.source).toBe("SELLING")
    expect(result?.price.toString()).toBe("99.5")
  })

  it("returns null when no active price", async () => {
    const db = {
      sellingPrice: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    }

    expect(await resolvePosRetailPrice(db, { productId: "p1" })).toBeNull()
  })
})
