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

  it("includes Finance, Operations, Shop, and System for HO_FINANCE", () => {
    const keys = getMainMenuSections("HO_FINANCE").map((section) => section.key)
    expect(keys).toEqual(["finance", "operations", "shop", "system"])
  })

  it("includes Operations and Shop only for HO_OPERATIONS", () => {
    const keys = getMainMenuSections("HO_OPERATIONS").map(
      (section) => section.key
    )
    expect(keys).toEqual(["operations", "shop"])
  })

  it("exposes product-reference under operations for HO_OPERATIONS only", () => {
    expect(getMainMenuSectionDetail("HO_OPERATIONS", "administration")).toBeNull()
    const items =
      getMainMenuSectionDetail("HO_OPERATIONS", "operations")?.items ?? []
    const keys = items.map((item) => item.key)
    expect(keys[0]).toBe("product-reference-stock")
    expect(findItem("HO_OPERATIONS", "product-reference-stock")?.label).toBe(
      "Product & Reference Stock"
    )
    expect(findItem("HO_OPERATIONS", "product-reference-stock")?.href).toBe(
      "/master/product-reference"
    )
    expect(findItem("HO_OPERATIONS", "product-reference-stock")?.hint).toBe(
      "Product, category, brand, unit, barcode and stock reference setup"
    )
    expect(findItem("HO_FINANCE", "product-reference-stock")).toBeUndefined()
    expect(findItem("HO_ADMIN", "product-reference-stock")?.href).toBe(
      "/master/product-reference"
    )
  })

  it("returns no sections for SH_STAFF", () => {
    expect(getMainMenuSections("SH_STAFF")).toEqual([])
  })

  it("section cards link to /main/{section}", () => {
    expect(getMainMenuSections("HO_ADMIN")[0]?.href).toBe("/master")
    expect(getMainMenuSections("HO_FINANCE")[0]?.href).toBe("/finance")
  })
})

describe("getMainMenuSectionDetail", () => {
  it("includes Finance F0 menu leaf links for HO_ADMIN finance flat items", () => {
    expect(findItem("HO_ADMIN", "mjv")?.href).toBe(
      "/finance/manual-journal-entries"
    )
    expect(findItem("HO_ADMIN", "trial-balance")?.href).toBe(
      "/finance/reports/trial-balance"
    )
    expect(findItem("HO_ADMIN", "general-ledger")?.href).toBe(
      "/finance/reports/general-ledger"
    )
    expect(findItem("HO_ADMIN", "profit-loss")?.href).toBe(
      "/finance/reports/profit-loss"
    )
    expect(findItem("HO_ADMIN", "balance-sheet")?.href).toBe(
      "/finance/reports/balance-sheet"
    )
    expect(findItem("HO_ADMIN", "pav")?.status).toBe("available")
    expect(findItem("HO_ADMIN", "rev")?.status).toBe("available")
    expect(findItem("HO_ADMIN", "rev")?.href).toBe("/finance/revenue-vouchers")
    expect(findItem("HO_ADMIN", "petty-cash")?.status).toBe("available")
    expect(findItem("HO_ADMIN", "retained-earnings")).toBeUndefined()
    expect(findItem("HO_ADMIN", "chart-of-accounts-import")).toBeUndefined()
    expect(findItem("HO_ADMIN", "reconciliation-dashboard")).toBeUndefined()
    expect(findItem("HO_ADMIN", "period-management")?.href).toBe("/finance/periods")
    expect(findItem("HO_ADMIN", "bank-reconciliation")?.href).toBe(
      "/finance/reconciliation/bank"
    )
    expect(findItem("HO_ADMIN", "cash-reconciliation")?.href).toBe(
      "/finance/reconciliation/cash"
    )
    expect(findItem("HO_ADMIN", "opening-balance")).toBeUndefined()
  })

  it("includes administration master links for HO_ADMIN", () => {
    const detail = getMainMenuSectionDetail("HO_ADMIN", "administration")
    expect(detail?.label).toBe("ADMINISTRATION")
    expect(findItem("HO_ADMIN", "product-reference-stock")?.href).toBe(
      "/master/product-reference"
    )
    expect(findItem("HO_ADMIN", "branch")?.href).toBe("/master/branch")
    expect(findItem("HO_ADMIN", "staff")?.href).toBe("/master/staff")
    expect(findItem("HO_ADMIN", "pricing")?.href).toBe("/master/pricing")
    expect(findItem("HO_ADMIN", "receipt-setup")?.href).toBe("/admin/receipt-setup")
    expect(findItem("HO_FINANCE", "receipt-setup")).toBeUndefined()
  })

  it("includes Stock Documents under operations for HO_FINANCE", () => {
    const detail = getMainMenuSectionDetail("HO_FINANCE", "operations")
    expect(detail?.label).toBe("OPERATIONS")
    expect(findItem("HO_FINANCE", "stock-documents")?.href).toBe(
      "/shop/stock-documents"
    )
  })

  it("includes Check Receipt under operations for HO roles", () => {
    expect(findItem("HO_ADMIN", "check-receipt")?.href).toBe(
      "/operations/check-receipt"
    )
    expect(findItem("HO_FINANCE", "check-receipt")?.href).toBe(
      "/operations/check-receipt"
    )
    expect(findItem("HO_OPERATIONS", "check-receipt")?.href).toBe(
      "/operations/check-receipt"
    )
    expect(findItem("SH_STAFF", "check-receipt")).toBeUndefined()
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

  it("HO_ADMIN and HO_FINANCE see active Import Accounting Data linking to finance system hub", () => {
    for (const role of ["HO_ADMIN", "HO_FINANCE"] as const) {
      const item = findItem(role, "import-accounting")
      expect(item?.status).toBe("available")
      expect(item?.label).toBe("Import Accounting Data")
      expect(item?.href).toBe("/finance/system")
      expect(item?.hint).toBe("Chart of accounts and finance setup imports")
    }
  })

  it("HO_FINANCE sees Import Accounting Data but not Import Master Database", () => {
    expect(findItem("HO_FINANCE", "import-accounting")?.href).toBe("/finance/system")
    expect(findItem("HO_FINANCE", "import-master-database")).toBeUndefined()
    expect(getMainMenuSectionDetail("HO_FINANCE", "system")).not.toBeNull()
  })

  it("HO_OPERATIONS cannot open system section", () => {
    expect(getMainMenuSectionDetail("HO_OPERATIONS", "system")).toBeNull()
    expect(findItem("HO_OPERATIONS", "import-accounting")).toBeUndefined()
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

  it("includes Sales Target Setup for HO shop section", () => {
    const item = findItem("HO_ADMIN", "sales-target-setup")
    expect(item?.status).toBe("available")
    expect(item?.href).toBe("/shop/sales-targets")
    expect(findItem("HO_OPERATIONS", "sales-target-setup")?.href).toBe(
      "/shop/sales-targets"
    )
    expect(findItem("SH_STAFF", "sales-target-setup")).toBeUndefined()
  })

  it("includes Last Month / Actual Sales dashboard for HO shop section", () => {
    const item = findItem("HO_ADMIN", "target-sales")
    expect(item?.status).toBe("available")
    expect(item?.label).toBe("Last Month / Actual Sales")
    expect(item?.href).toBe("/shop/target-sales")
    expect(findItem("HO_OPERATIONS", "target-sales")?.href).toBe(
      "/shop/target-sales"
    )
    expect(findItem("SH_STAFF", "target-sales")).toBeUndefined()
  })

  it("hides Last Month / Actual Sales for ASAD document entity", () => {
    expect(
      getMainMenuItems("HO_ADMIN", "AD").find((item) => item.key === "target-sales")
    ).toBeUndefined()
    expect(
      getMainMenuSectionDetail("HO_ADMIN", "shop", "AD")?.items.some(
        (item) => item.key === "target-sales"
      )
    ).toBe(false)
    expect(
      getMainMenuItems("HO_ADMIN", "AS").find((item) => item.key === "target-sales")
        ?.href
    ).toBe("/shop/target-sales")
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
