import { assignCatalogSlotProductCodes } from "@/lib/catalog-image/assign-slot-codes"
import { CatalogImageError } from "@/lib/catalog-image/errors"

describe("assignCatalogSlotProductCodes", () => {
  it("assigns 6 sequential filenames from starting product id 1010152", () => {
    const slots = assignCatalogSlotProductCodes("1010152", 6)
    expect(slots).toHaveLength(6)
    expect(slots[0]).toEqual({
      sourceSlot: 1,
      productCode: "0101015",
      finalFileName: "0101015.png",
    })
    expect(slots[1]).toEqual({
      sourceSlot: 2,
      productCode: "0101016",
      finalFileName: "0101016.png",
    })
    expect(slots[5]).toEqual({
      sourceSlot: 6,
      productCode: "0101020",
      finalFileName: "0101020.png",
    })
  })

  it("rejects invalid starting product id", () => {
    expect(() => assignCatalogSlotProductCodes("123", 6)).toThrow(
      CatalogImageError
    )
  })
})
