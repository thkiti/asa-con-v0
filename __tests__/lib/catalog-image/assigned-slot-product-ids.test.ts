import { assignCatalogSlotProductCodes } from "@/lib/catalog-image/assign-slot-codes"
import {
  hasManualAssignedSlotEdits,
  resolveAssignedSlotProductCode,
  updateAssignedSlotProductId,
  validateAssignedSlotProductIds,
} from "@/lib/catalog-image/assigned-slot-product-ids"

describe("assigned slot product id editing", () => {
  it("keeps sequential default assignment from starting product id", () => {
    const slots = assignCatalogSlotProductCodes("1010152", 3)
    expect(slots.map((slot) => slot.productCode)).toEqual([
      "0101015",
      "0101016",
      "0101017",
    ])
    expect(slots.map((slot) => slot.finalFileName)).toEqual([
      "0101015.png",
      "0101016.png",
      "0101017.png",
    ])
  })

  it("edits one slot without changing other slots", () => {
    const slots = assignCatalogSlotProductCodes("1010152", 3)
    const updated = updateAssignedSlotProductId(slots, 2, "0101999")

    expect(updated[0]).toEqual(slots[0])
    expect(updated[2]).toEqual(slots[2])
    expect(updated[1]).toEqual({
      sourceSlot: 2,
      productCode: "0101999",
      finalFileName: "0101999.png",
    })
  })

  it("regenerates filename after editing a slot product id", () => {
    const slots = assignCatalogSlotProductCodes("1010152", 2)
    const updated = updateAssignedSlotProductId(slots, 1, "1234567")

    expect(updated[0]?.finalFileName).toBe("1234567.png")
    expect(resolveAssignedSlotProductCode(updated[0]!.productCode)).toBe(
      "1234567"
    )
  })

  it("rejects duplicate product ids within the current page", () => {
    const slots = assignCatalogSlotProductCodes("1010152", 3)
    const withDuplicate = updateAssignedSlotProductId(slots, 3, "0101015")
    const result = validateAssignedSlotProductIds(withDuplicate)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toContain("duplicate Product ID 0101015")
    expect(result.message).toMatch(/Slots 1 and 3/)
  })

  it("rejects empty and invalid product ids", () => {
    const slots = assignCatalogSlotProductCodes("1010152", 2)
    const empty = updateAssignedSlotProductId(slots, 1, "   ")
    const emptyResult = validateAssignedSlotProductIds(empty)
    expect(emptyResult.ok).toBe(false)
    if (!emptyResult.ok) {
      expect(emptyResult.message).toBe("Slot 1 has an empty Product ID")
    }

    const invalid = updateAssignedSlotProductId(slots, 2, "12")
    const invalidResult = validateAssignedSlotProductIds(invalid)
    expect(invalidResult.ok).toBe(false)
    if (!invalidResult.ok) {
      expect(invalidResult.message).toBe("Slot 2 has an invalid Product ID")
    }
  })

  it("preserves manual edits when checking against sequential assignment", () => {
    const slots = assignCatalogSlotProductCodes("1010152", 3)
    expect(hasManualAssignedSlotEdits(slots, "1010152")).toBe(false)

    const edited = updateAssignedSlotProductId(slots, 2, "0101888")
    expect(hasManualAssignedSlotEdits(edited, "1010152")).toBe(true)

    // Crop / layout changes do not touch slot product codes — same edited list stays manual
    expect(hasManualAssignedSlotEdits(edited, "1010152")).toBe(true)
  })
})
