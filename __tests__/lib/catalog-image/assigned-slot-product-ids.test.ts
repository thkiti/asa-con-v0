import { assignCatalogSlotProductCodes } from "@/lib/catalog-image/assign-slot-codes"
import {
  hasManualAssignedSlotEdits,
  resolveAssignedSlotProductCode,
  resolveAssignedSlotsForSave,
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

  it("treats blank slot as skipped and valid", () => {
    const slots = assignCatalogSlotProductCodes("1010152", 3)
    const cleared = updateAssignedSlotProductId(slots, 2, "")
    expect(cleared[1]).toEqual({
      sourceSlot: 2,
      productCode: "",
      finalFileName: "",
    })

    const result = validateAssignedSlotProductIds(cleared)
    expect(result.ok).toBe(true)
  })

  it("regenerates filename after editing a slot product id", () => {
    const slots = assignCatalogSlotProductCodes("1010152", 2)
    const updated = updateAssignedSlotProductId(slots, 1, "1234567")

    expect(updated[0]?.finalFileName).toBe("1234567.png")
    expect(resolveAssignedSlotProductCode(updated[0]!.productCode)).toBe(
      "1234567"
    )
  })

  it("skipped slot does not generate a filename", () => {
    const slots = assignCatalogSlotProductCodes("1010152", 2)
    const cleared = updateAssignedSlotProductId(slots, 1, "")
    expect(cleared[0]?.finalFileName).toBe("")
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

  it("duplicate validation ignores blank slots", () => {
    const slots = assignCatalogSlotProductCodes("1010152", 3)
    const cleared = updateAssignedSlotProductId(slots, 2, "")
    const reusingClearedSlot2 = updateAssignedSlotProductId(
      cleared,
      3,
      "0101016"
    )
    const result = validateAssignedSlotProductIds(reusingClearedSlot2)
    expect(result.ok).toBe(true)
  })

  it("rejects invalid product ids (non-blank)", () => {
    const slots = assignCatalogSlotProductCodes("1010152", 2)
    const invalid = updateAssignedSlotProductId(slots, 2, "12")
    const invalidResult = validateAssignedSlotProductIds(invalid)
    expect(invalidResult.ok).toBe(false)
    if (!invalidResult.ok) {
      expect(invalidResult.message).toBe("Slot 2 has an invalid Product ID")
    }
  })

  it("rejects saving when all slots are blank", () => {
    const slots = assignCatalogSlotProductCodes("1010152", 2)
    const cleared1 = updateAssignedSlotProductId(slots, 1, "")
    const cleared2 = updateAssignedSlotProductId(cleared1, 2, "")
    const result = validateAssignedSlotProductIds(cleared2)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toBe("กรุณากำหนด Product ID อย่างน้อย 1 Slot")
    }
  })

  it("skipped slot is excluded from save payload", () => {
    const slots = assignCatalogSlotProductCodes("1010152", 3)
    const cleared = updateAssignedSlotProductId(slots, 2, "")
    const resolved = resolveAssignedSlotsForSave(cleared)
    expect(resolved.map((slot) => slot.sourceSlot)).toEqual([1, 3])
    expect(resolved.some((slot) => slot.sourceSlot === 2)).toBe(false)
    expect(resolved.map((slot) => slot.finalFileName)).toEqual([
      "0101015.png",
      "0101017.png",
    ])
  })

  it("later Product IDs are not renumbered after clearing a middle slot", () => {
    const slots = assignCatalogSlotProductCodes("1010152", 6)
    const cleared = updateAssignedSlotProductId(slots, 3, "")
    expect(cleared[3]!.productCode).toBe(slots[3]!.productCode)
    expect(cleared[4]!.productCode).toBe(slots[4]!.productCode)
  })

  it("preserves manual edits when checking against sequential assignment", () => {
    const slots = assignCatalogSlotProductCodes("1010152", 3)
    expect(hasManualAssignedSlotEdits(slots, "1010152")).toBe(false)

    const edited = updateAssignedSlotProductId(slots, 2, "0101888")
    expect(hasManualAssignedSlotEdits(edited, "1010152")).toBe(true)
  })

  it("manual-edit detection includes cleared (skipped) slots", () => {
    const slots = assignCatalogSlotProductCodes("1010152", 3)
    const cleared = updateAssignedSlotProductId(slots, 2, "")
    expect(hasManualAssignedSlotEdits(cleared, "1010152")).toBe(true)
  })
})
