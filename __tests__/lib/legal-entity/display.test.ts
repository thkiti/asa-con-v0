import {
  formatEntityDisplay,
  formatEntityShort,
  formatEntityThai,
  normalizeDocumentEntityCode,
} from "@/lib/legal-entity/display"

describe("entity display formatters", () => {
  it("formatEntityShort always returns ASAS or ASAD", () => {
    expect(formatEntityShort("AS")).toBe("ASAS")
    expect(formatEntityShort("AD")).toBe("ASAD")
    expect(formatEntityShort("ASAS")).toBe("ASAS")
    expect(formatEntityShort("ASAD")).toBe("ASAD")
  })

  it("formatEntityThai returns Thai legal names", () => {
    expect(formatEntityThai("AS")).toBe("อาสา เซอร์วิส")
    expect(formatEntityThai("AD")).toBe("อาสา ดิสทริบิวชั่น")
  })

  it("formatEntityDisplay switches by locale", () => {
    expect(formatEntityDisplay("AS", "en")).toBe("ASAS")
    expect(formatEntityDisplay("AS", "th")).toBe("อาสา เซอร์วิส")
  })

  it("normalizeDocumentEntityCode maps short and long forms", () => {
    expect(normalizeDocumentEntityCode("ASAS")).toBe("AS")
    expect(normalizeDocumentEntityCode("ASAD")).toBe("AD")
    expect(normalizeDocumentEntityCode("AS")).toBe("AS")
  })
})
