import {
  buildProductGroup,
  cleanGroupDisplayName,
  extractRunFromProductGroup,
} from "@/lib/master/build-product-group"

describe("buildProductGroup", () => {
  it("combines first 4 digits with padded run", () => {
    expect(buildProductGroup("0101035", "900")).toBe("0101900")
    expect(buildProductGroup("5101001", "9")).toBe("5101009")
  })

  it("returns empty when product code has no digits", () => {
    expect(buildProductGroup("", "900")).toBe("")
    expect(buildProductGroup("ABC", "900")).toBe("")
  })
})

describe("extractRunFromProductGroup", () => {
  it("extracts run from 7-digit group code", () => {
    expect(extractRunFromProductGroup("0101900")).toBe("900")
    expect(extractRunFromProductGroup("0101901")).toBe("901")
  })

  it("defaults to 900 when missing", () => {
    expect(extractRunFromProductGroup(null)).toBe("900")
    expect(extractRunFromProductGroup("0101")).toBe("900")
  })
})

describe("cleanGroupDisplayName", () => {
  it("strips size suffixes", () => {
    expect(cleanGroupDisplayName("Widget size L")).toBe("Widget")
  })
})
