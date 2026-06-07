import { CatalogImageError } from "@/lib/catalog-image/errors"
import { normalizeCatalogProductCode } from "@/lib/catalog-image/normalize-catalog-code"

describe("normalizeCatalogProductCode", () => {
  it("normalizes 7-digit catalog code with checksum removal and leading zero pad", () => {
    expect(normalizeCatalogProductCode("1010152")).toBe("0101015")
  })

  it("strips non-digits before processing", () => {
    expect(normalizeCatalogProductCode("10-1015-2")).toBe("0101015")
  })

  it("returns 7-digit code as-is when remaining length is 7", () => {
    expect(normalizeCatalogProductCode("12345678")).toBe("1234567")
  })

  it("throws CATALOG_CODE_TOO_SHORT when fewer than 2 digits", () => {
    expect(() => normalizeCatalogProductCode("1")).toThrow(CatalogImageError)
    try {
      normalizeCatalogProductCode("1")
    } catch (err) {
      expect(err).toMatchObject({ code: "CATALOG_CODE_TOO_SHORT" })
    }
  })

  it("throws INVALID_CATALOG_CODE_LENGTH for invalid remaining length", () => {
    expect(() => normalizeCatalogProductCode("12345")).toThrow(CatalogImageError)
    try {
      normalizeCatalogProductCode("12345")
    } catch (err) {
      expect(err).toMatchObject({ code: "INVALID_CATALOG_CODE_LENGTH" })
    }
  })
})
