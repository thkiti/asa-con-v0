import { canAccessRoute } from "@/lib/permissions/route-access"

describe("system route access", () => {
  it("allows HO_ADMIN to access /system/import", () => {
    expect(canAccessRoute("/system/import", "HO_ADMIN")).toBe(true)
    expect(canAccessRoute("/system/import/branch", "HO_ADMIN")).toBe(true)
    expect(canAccessRoute("/system/import/product", "HO_ADMIN")).toBe(true)
    expect(canAccessRoute("/system/import/reference-stock", "HO_ADMIN")).toBe(true)
    expect(canAccessRoute("/system/import/staff", "HO_ADMIN")).toBe(true)
  })

  it("denies non-HO_ADMIN roles", () => {
    expect(canAccessRoute("/system/import", "HO_FINANCE")).toBe(false)
    expect(canAccessRoute("/system/import", "HO_OPERATIONS")).toBe(false)
    expect(canAccessRoute("/system/import", "SH_STAFF")).toBe(false)
  })
})
