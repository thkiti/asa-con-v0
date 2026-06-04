import { ProductType } from "@/generated/prisma/client"
import { resolvePricingClass } from "@/lib/pricing/resolve-pricing-class"

describe("resolvePricingClass", () => {
  it("returns CONSUMABLE for consumable products", () => {
    expect(
      resolvePricingClass({ productType: ProductType.CONSUMABLE, groupCode: 10 })
    ).toBe("CONSUMABLE")
  })

  it("returns MACHINERY for high group codes", () => {
    expect(
      resolvePricingClass({ productType: ProductType.TRACKED, groupCode: 90 })
    ).toBe("MACHINERY")
  })

  it("returns MATERIAL for tracked low group", () => {
    expect(
      resolvePricingClass({ productType: ProductType.TRACKED, groupCode: 12 })
    ).toBe("MATERIAL")
  })
})
