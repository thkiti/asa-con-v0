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

  it("bypasses catalog-image product URL API", () => {
    expect(isApiBypassPath("/api/catalog-image/product-url")).toBe(true)
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

  it("allows /main for any authenticated role", () => {
    expect(canAccessRoute("/main", "SH_STAFF")).toBe(true)
    expect(canAccessRoute("/main", "HO_ADMIN")).toBe(true)
    expect(canAccessRoute("/main", null)).toBe(false)
  })

  it("allows /main section paths for authenticated roles", () => {
    expect(canAccessRoute("/main/finance", "HO_FINANCE")).toBe(true)
    expect(canAccessRoute("/main/operations", "HO_OPERATIONS")).toBe(true)
    expect(canAccessRoute("/main/administration", "SH_STAFF")).toBe(true)
  })

  it("allows /master only for HO_ADMIN", () => {
    expect(canAccessRoute("/master", "HO_ADMIN")).toBe(true)
    expect(canAccessRoute("/master/product-reference", "HO_ADMIN")).toBe(true)
    expect(canAccessRoute("/master/branch", "HO_ADMIN")).toBe(true)
    expect(canAccessRoute("/master/branch", "HO_FINANCE")).toBe(false)
    expect(canAccessRoute("/master/staff", "SH_STAFF")).toBe(false)
  })

  it("allows /api/master routes only for HO_ADMIN", () => {
    expect(canAccessRoute("/api/master/branches", "HO_ADMIN")).toBe(true)
    expect(canAccessRoute("/api/master/staff", "HO_ADMIN")).toBe(true)
    expect(canAccessRoute("/api/master/product-reference", "HO_ADMIN")).toBe(true)
    expect(canAccessRoute("/api/master/branches", "HO_FINANCE")).toBe(false)
    expect(canAccessRoute("/api/master/staff", "SH_STAFF")).toBe(false)
  })

  it("allows /api/admin routes for roles with admin area", () => {
    expect(canAccessRoute("/api/admin/thermal-layouts", "HO_ADMIN")).toBe(true)
    expect(canAccessRoute("/admin/receipt-setup", "HO_ADMIN")).toBe(true)
    expect(canAccessRoute("/api/admin/thermal-layouts", "HO_FINANCE")).toBe(true)
    expect(canAccessRoute("/api/admin/thermal-layouts", "HO_OPERATIONS")).toBe(
      false
    )
    expect(canAccessRoute("/api/admin/thermal-layouts", "SH_STAFF")).toBe(false)
  })

  it("allows /api/shop routes for roles with shop area", () => {
    expect(canAccessRoute("/api/shop/sales-targets/branches", "HO_ADMIN")).toBe(
      true
    )
    expect(canAccessRoute("/api/shop/sales-targets/branches", "HO_FINANCE")).toBe(
      true
    )
    expect(canAccessRoute("/api/shop/sales-targets/branches", "HO_OPERATIONS")).toBe(
      true
    )
    expect(canAccessRoute("/api/shop/sales-targets/branches", "SH_STAFF")).toBe(
      true
    )
  })
})
