import { CatalogImageError } from "@/lib/catalog-image/errors"
import { parseOptionalPageNo, parsePageNo } from "@/lib/catalog-image/parse-page-no"

describe("parsePageNo", () => {
  it("defaults to 1 when value is omitted", () => {
    expect(parsePageNo(undefined, 1)).toBe(1)
    expect(parsePageNo(null, 1)).toBe(1)
    expect(parsePageNo("", 1)).toBe(1)
  })

  it("parses positive integers", () => {
    expect(parsePageNo("3", 1)).toBe(3)
    expect(parsePageNo(5, 1)).toBe(5)
  })

  it("rejects invalid page numbers", () => {
    expect(() => parsePageNo(0, 1)).toThrow(CatalogImageError)
    expect(() => parsePageNo(-1, 1)).toThrow(CatalogImageError)
    expect(() => parsePageNo(1.5, 1)).toThrow(CatalogImageError)
    expect(() => parsePageNo("abc", 1)).toThrow(CatalogImageError)
  })
})

describe("parseOptionalPageNo", () => {
  it("returns undefined when omitted", () => {
    expect(parseOptionalPageNo(undefined)).toBeUndefined()
    expect(parseOptionalPageNo(null)).toBeUndefined()
    expect(parseOptionalPageNo("")).toBeUndefined()
  })

  it("parses page number when provided", () => {
    expect(parseOptionalPageNo(2)).toBe(2)
    expect(parseOptionalPageNo("4")).toBe(4)
  })
})
