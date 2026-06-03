import {
  canAccessMainMenuSection,
  getMainMenuGroups,
  getMainMenuItems,
  getMainMenuSectionDetail,
  getMainMenuSections,
  isHoMainMenuRole,
} from "@/lib/main-ui/main-menu"

function findItem(role: Parameters<typeof getMainMenuItems>[0], key: string) {
  return getMainMenuItems(role).find((item) => item.key === key)
}

function findGroup(role: Parameters<typeof getMainMenuGroups>[0], key: string) {
  return getMainMenuGroups(role).find((group) => group.key === key)
}

describe("isHoMainMenuRole", () => {
  it("returns false for SH_STAFF", () => {
    expect(isHoMainMenuRole("SH_STAFF")).toBe(false)
  })

  it("returns true for HO roles", () => {
    expect(isHoMainMenuRole("HO_ADMIN")).toBe(true)
    expect(isHoMainMenuRole("HO_FINANCE")).toBe(true)
    expect(isHoMainMenuRole("HO_OPERATIONS")).toBe(true)
  })
})

describe("getMainMenuSections", () => {
  it("includes all five sections for HO_ADMIN", () => {
    const keys = getMainMenuSections("HO_ADMIN").map((section) => section.key)
    expect(keys).toEqual([
      "administration",
      "finance",
      "operations",
      "shop",
      "system",
    ])
  })

  it("includes Finance, Operations, Shop for HO_FINANCE", () => {
    const keys = getMainMenuSections("HO_FINANCE").map((section) => section.key)
    expect(keys).toEqual(["finance", "operations", "shop"])
  })

  it("includes Operations and Shop only for HO_OPERATIONS", () => {
    const keys = getMainMenuSections("HO_OPERATIONS").map(
      (section) => section.key
    )
    expect(keys).toEqual(["operations", "shop"])
  })

  it("returns no sections for SH_STAFF", () => {
    expect(getMainMenuSections("SH_STAFF")).toEqual([])
  })

  it("section cards link to /main/{section}", () => {
    expect(getMainMenuSections("HO_ADMIN")[0]?.href).toBe("/main/administration")
    expect(getMainMenuSections("HO_FINANCE")[0]?.href).toBe("/main/finance")
  })
})

describe("getMainMenuSectionDetail", () => {
  it("includes Finance hub for HO_ADMIN finance section", () => {
    const detail = getMainMenuSectionDetail("HO_ADMIN", "finance")
    expect(detail?.label).toBe("FINANCE")
    expect(findItem("HO_ADMIN", "finance")?.href).toBe("/finance")
  })

  it("includes administration master links for HO_ADMIN", () => {
    const detail = getMainMenuSectionDetail("HO_ADMIN", "administration")
    expect(detail?.label).toBe("ADMINISTRATION")
    expect(findItem("HO_ADMIN", "product-reference-stock")?.href).toBe(
      "/master/product-reference"
    )
    expect(findItem("HO_ADMIN", "branch")?.href).toBe("/master/branch")
    expect(findItem("HO_ADMIN", "staff")?.href).toBe("/master/staff")
  })

  it("includes Stock Documents under operations for HO_FINANCE", () => {
    const detail = getMainMenuSectionDetail("HO_FINANCE", "operations")
    expect(detail?.label).toBe("OPERATIONS")
    expect(findItem("HO_FINANCE", "stock-documents")?.href).toBe(
      "/shop/stock-documents"
    )
  })

  it("returns null for SH_STAFF on any section", () => {
    expect(getMainMenuSectionDetail("SH_STAFF", "operations")).toBeNull()
    expect(getMainMenuSectionDetail("SH_STAFF", "shop")).toBeNull()
  })

  it("returns null when HO_OPERATIONS requests finance section", () => {
    expect(getMainMenuSectionDetail("HO_OPERATIONS", "finance")).toBeNull()
  })

  it("HO_ADMIN sees Import Master Database in system section", () => {
    const detail = getMainMenuSectionDetail("HO_ADMIN", "system")
    expect(detail?.label).toBe("SYSTEM")
    expect(findItem("HO_ADMIN", "import-master-database")?.href).toBe(
      "/system/import"
    )
  })

  it("SH_STAFF does not see system import via flat items", () => {
    expect(findItem("SH_STAFF", "import-master-database")).toBeUndefined()
  })

  it("does not include New Stock Document entry", () => {
    expect(findItem("HO_ADMIN", "stock-new")).toBeUndefined()
    expect(findItem("HO_FINANCE", "stock-new")).toBeUndefined()
  })

  it("planned stock items have no href", () => {
    expect(findItem("HO_ADMIN", "stock-card")?.status).toBe("planned")
    expect(findItem("HO_ADMIN", "stock-card")?.href).toBeUndefined()
  })
})

describe("canAccessMainMenuSection", () => {
  it("denies all sections for SH_STAFF", () => {
    expect(canAccessMainMenuSection("SH_STAFF", "shop")).toBe(false)
    expect(canAccessMainMenuSection("SH_STAFF", "operations")).toBe(false)
  })

  it("denies finance section for HO_OPERATIONS", () => {
    expect(canAccessMainMenuSection("HO_OPERATIONS", "finance")).toBe(false)
    expect(canAccessMainMenuSection("HO_OPERATIONS", "operations")).toBe(true)
  })
})

describe("getMainMenuGroups (compat)", () => {
  it("maps administration group for HO_ADMIN", () => {
    const group = findGroup("HO_ADMIN", "administration")
    expect(group?.label).toBe("ADMINISTRATION")
  })

  it("SH_STAFF has no groups", () => {
    expect(getMainMenuGroups("SH_STAFF")).toEqual([])
  })
})
