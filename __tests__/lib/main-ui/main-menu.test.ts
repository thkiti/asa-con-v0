import { getMainMenuItems } from "@/lib/main-ui/main-menu"

describe("getMainMenuItems", () => {
  it("includes stock documents link for SH_STAFF", () => {
    const items = getMainMenuItems("SH_STAFF")
    expect(items.some((item) => item.href === "/shop/stock-documents")).toBe(true)
    expect(items.some((item) => item.href === "/shop/stock-documents/new")).toBe(
      true
    )
  })

  it("HO_ADMIN sees System Import", () => {
    const items = getMainMenuItems("HO_ADMIN")
    expect(items.some((item) => item.href === "/system/import")).toBe(true)
  })

  it("SH_STAFF does not see System Import", () => {
    const items = getMainMenuItems("SH_STAFF")
    expect(items.some((item) => item.href === "/system/import")).toBe(false)
  })

  it("SH_STAFF does not see Finance", () => {
    const items = getMainMenuItems("SH_STAFF")
    expect(items.some((item) => item.href === "/finance")).toBe(false)
  })

  it("HO_FINANCE sees Finance but not System Import", () => {
    const items = getMainMenuItems("HO_FINANCE")
    expect(items.some((item) => item.href === "/finance")).toBe(true)
    expect(items.some((item) => item.href === "/system/import")).toBe(false)
  })

  it("shows maintenance areas as coming soon without href", () => {
    const items = getMainMenuItems("HO_ADMIN")
    const product = items.find((item) => item.key === "product")
    expect(product?.status).toBe("coming-soon")
    expect(product?.href).toBeUndefined()
  })
})
