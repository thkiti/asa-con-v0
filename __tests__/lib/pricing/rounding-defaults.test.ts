import { ROUNDING_MODE_LABELS, defaultRoundingModeForClass } from "@/lib/pricing/rounding-defaults"

describe("rounding defaults", () => {
  it("exposes all rounding mode labels", () => {
    expect(Object.keys(ROUNDING_MODE_LABELS).sort()).toEqual(
      ["BAHT_1", "BAHT_10", "BAHT_100", "CENT_01", "CENT_05", "NONE"].sort()
    )
  })

  it("maps business defaults", () => {
    expect(defaultRoundingModeForClass("MATERIAL")).toBe("CENT_05")
    expect(defaultRoundingModeForClass("MACHINERY")).toBe("BAHT_10")
    expect(defaultRoundingModeForClass("CONSUMABLE")).toBe("CENT_01")
  })
})
