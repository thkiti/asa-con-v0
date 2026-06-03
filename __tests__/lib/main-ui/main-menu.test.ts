import { getMainMenuGroups, getMainMenuItems } from "@/lib/main-ui/main-menu"

function findItem(role: Parameters<typeof getMainMenuItems>[0], key: string) {
  return getMainMenuItems(role).find((item) => item.key === key)
}

function findGroup(role: Parameters<typeof getMainMenuGroups>[0], key: string) {
  return getMainMenuGroups(role).find((group) => group.key === key)
}

describe("getMainMenuGroups", () => {
  it("includes Finance group with /finance for HO_ADMIN", () => {
    const group = findGroup("HO_ADMIN", "finance")
    expect(group?.label).toBe("Finance")
    expect(findItem("HO_ADMIN", "finance")?.href).toBe("/finance")
  })

  it("includes Stock group with stock documents for SH_STAFF", () => {
    const group = findGroup("SH_STAFF", "stock")
    expect(group?.label).toBe("Stock")
    expect(findItem("SH_STAFF", "stock-documents")?.href).toBe(
      "/shop/stock-documents"
    )
  })

  it("does not include New Stock Document entry", () => {
    expect(findItem("SH_STAFF", "stock-new")).toBeUndefined()
    expect(findItem("HO_ADMIN", "stock-new")).toBeUndefined()
  })

  it("includes Master Database group with planned items only", () => {
    const group = findGroup("HO_ADMIN", "master-database")
    expect(group?.label).toBe("Master Database")
    const product = findItem("HO_ADMIN", "product-reference-stock")
    expect(product?.status).toBe("planned")
    expect(product?.href).toBeUndefined()
  })

  it("HO_ADMIN sees System Import in System group", () => {
    const group = findGroup("HO_ADMIN", "system")
    expect(group?.label).toBe("System")
    expect(findItem("HO_ADMIN", "system-import")?.href).toBe("/system/import")
  })

  it("SH_STAFF does not see System Import", () => {
    expect(findItem("SH_STAFF", "system-import")).toBeUndefined()
  })

  it("SH_STAFF does not see Finance group", () => {
    expect(findGroup("SH_STAFF", "finance")).toBeUndefined()
  })

  it("HO_FINANCE sees Finance but not System Import", () => {
    expect(findGroup("HO_FINANCE", "finance")).toBeDefined()
    expect(findItem("HO_FINANCE", "system-import")).toBeUndefined()
  })

  it("planned stock items have no href", () => {
    expect(findItem("SH_STAFF", "stock-card")?.status).toBe("planned")
    expect(findItem("SH_STAFF", "stock-card")?.href).toBeUndefined()
  })
})
