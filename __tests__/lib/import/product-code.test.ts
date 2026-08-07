import {
  normalizePosinyProductCode,
  normalizeReferenceProductCode,
  normalizeInternalProductCode,
} from "@/lib/import/validation/product-code"

describe("product code normalization", () => {
  it("pads POSINY I_ID to 7-digit undashed code", () => {
    expect(normalizePosinyProductCode(101015)).toEqual({
      code: "0101015",
      groupCode: 1,
      typeCode: 1,
      runningCode: 15,
    })
  })

  it("rejects invalid POSINY codes", () => {
    expect(normalizePosinyProductCode("abc")).toBeNull()
    expect(normalizePosinyProductCode("")).toBeNull()
  })

  it("strips reference barcode check digit and pads to 7 digits", () => {
    expect(normalizeReferenceProductCode("1010015")).toBe("0101001")
    expect(normalizeReferenceProductCode("21010323")).toBe("2101032")
  })

  it("removes dashes and quotes from reference codes", () => {
    expect(normalizeReferenceProductCode('"01-010-015"')).toBe("0101001")
  })

  it("preserves internal 7-digit codes without check-digit strip", () => {
    expect(normalizeInternalProductCode("0105006")).toBe("0105006")
    expect(normalizeInternalProductCode("0105901")).toBe("0105901")
  })
})
