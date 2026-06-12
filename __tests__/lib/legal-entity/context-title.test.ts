import { formatEntityContextTitle } from "@/lib/legal-entity/context-title"

describe("formatEntityContextTitle", () => {
  it("prefixes entity display name and uppercases page segments", () => {
    expect(formatEntityContextTitle("AS", "Main Menu")).toBe("ASAS • MAIN MENU")
    expect(formatEntityContextTitle("AD", "Finance")).toBe("ASAD • FINANCE")
  })

  it("supports multiple business context segments", () => {
    expect(formatEntityContextTitle("AS", "Adjustment", "SH001")).toBe(
      "ASAS • ADJUSTMENT • SH001"
    )
    expect(formatEntityContextTitle("AD", "Purchase", "HO999")).toBe(
      "ASAD • PURCHASE • HO999"
    )
  })
})
