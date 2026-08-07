import {
  normalizeInternalProductCode,
  normalizeReferenceProductCode,
} from "@/lib/import/validation/product-code"
import {
  parseProductGroup,
  parseReferenceFields,
  parseReferenceProductCode,
} from "@/lib/master/validate-reference-fields"

describe("normalizeInternalProductCode", () => {
  it("preserves exact 7-digit internal codes", () => {
    expect(normalizeInternalProductCode("0105006")).toBe("0105006")
    expect(normalizeInternalProductCode("0105901")).toBe("0105901")
    expect(normalizeInternalProductCode("0101900")).toBe("0101900")
    expect(normalizeInternalProductCode("0101901")).toBe("0101901")
  })

  it("keeps 0101900 and 0101901 distinct", () => {
    expect(normalizeInternalProductCode("0101900")).not.toBe(
      normalizeInternalProductCode("0101901")
    )
  })

  it("pads shorter numeric codes without stripping", () => {
    expect(normalizeInternalProductCode("105006")).toBe("0105006")
  })

  it("rejects non-numeric and over-long values", () => {
    expect(normalizeInternalProductCode("abc")).toBe("")
    expect(normalizeInternalProductCode("01050061")).toBe("")
  })
})

describe("Master parseReferenceFields use internal codes", () => {
  it("create-style fields preserve productCode 0105006", () => {
    expect(parseReferenceProductCode("0105006")).toBe("0105006")
    expect(
      parseReferenceFields({
        hookGroup: "K",
        hookNo: 1,
        supplierCode: "K.338",
        productCode: "0105006",
        productGroup: "0105901",
      })
    ).toMatchObject({
      productCode: "0105006",
      productGroup: "0105901",
    })
  })

  it("update-style productGroup 0105901 is stored as-is", () => {
    expect(parseProductGroup("0105901")).toBe("0105901")
  })

  it("does not check-digit-strip 7-digit internal codes", () => {
    expect(parseReferenceProductCode("0105006")).not.toBe("0010500")
    expect(parseProductGroup("0105901")).not.toBe("0010590")
    expect(parseProductGroup("0101901")).not.toBe("0010190")
  })
})

describe("normalizeReferenceProductCode still strips barcodes", () => {
  it("strips reference barcode check digit and pads to 7 digits", () => {
    expect(normalizeReferenceProductCode("1010015")).toBe("0101001")
    expect(normalizeReferenceProductCode("21010323")).toBe("2101032")
  })

  it("removes dashes and quotes from reference codes", () => {
    expect(normalizeReferenceProductCode('"01-010-015"')).toBe("0101001")
  })
})
