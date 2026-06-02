import {
  API_BYPASS_PATHS,
  canAccessRoute,
  isApiBypassPath,
} from "@/lib/permissions/route-access"

describe("API_BYPASS_PATHS", () => {
  it("includes finance, pos, and stock-document API prefixes", () => {
    expect(API_BYPASS_PATHS).toEqual(
      expect.arrayContaining([
        "/api/finance",
        "/api/pos",
        "/api/stock-document",
      ])
    )
  })
})

describe("isApiBypassPath", () => {
  it("bypasses /api/finance/periods", () => {
    expect(isApiBypassPath("/api/finance/periods")).toBe(true)
  })

  it("bypasses /api/pos/checkout", () => {
    expect(isApiBypassPath("/api/pos/checkout")).toBe(true)
  })

  it("bypasses existing health and session paths", () => {
    expect(isApiBypassPath("/api/health")).toBe(true)
    expect(isApiBypassPath("/api/auth/session")).toBe(true)
  })

  it("bypasses stock-document API", () => {
    expect(isApiBypassPath("/api/stock-document")).toBe(true)
    expect(isApiBypassPath("/api/stock-document/doc-1")).toBe(true)
  })

  it("does not bypass unrelated API paths", () => {
    expect(isApiBypassPath("/api/stock")).toBe(false)
    expect(isApiBypassPath("/api/products")).toBe(false)
  })
})

describe("canAccessRoute", () => {
  it("still requires finance area for /finance pages", () => {
    expect(canAccessRoute("/finance/periods", "HO_FINANCE")).toBe(true)
    expect(canAccessRoute("/finance/periods", "SH_STAFF")).toBe(false)
  })

  it("still requires shop area for /shop pages", () => {
    expect(canAccessRoute("/shop/pos", "SH_STAFF")).toBe(true)
    expect(canAccessRoute("/shop/pos", null)).toBe(false)
  })

  it("denies unknown paths without a matching area", () => {
    expect(canAccessRoute("/api/finance/periods", "HO_FINANCE")).toBe(false)
  })
})
