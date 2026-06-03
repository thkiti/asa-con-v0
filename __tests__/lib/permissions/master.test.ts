import { canAccessMasterDatabase } from "@/lib/permissions/master"

describe("canAccessMasterDatabase", () => {
  it("allows HO_ADMIN only", () => {
    expect(canAccessMasterDatabase("HO_ADMIN")).toBe(true)
    expect(canAccessMasterDatabase("HO_FINANCE")).toBe(false)
    expect(canAccessMasterDatabase("HO_OPERATIONS")).toBe(false)
    expect(canAccessMasterDatabase("SH_STAFF")).toBe(false)
    expect(canAccessMasterDatabase(null)).toBe(false)
  })
})
