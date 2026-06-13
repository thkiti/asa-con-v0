import {
  listModeToRefFilter,
  refFilterToListMode,
} from "@/components/master/product-reference/ProductReferenceFilterBar"

describe("ProductReferenceFilterBar mode helpers", () => {
  it("maps ref filter to list mode", () => {
    expect(refFilterToListMode("all")).toBe("active")
    expect(refFilterToListMode("active")).toBe("active")
    expect(refFilterToListMode("trash")).toBe("trash")
  })

  it("maps list mode to ref filter", () => {
    expect(listModeToRefFilter("active")).toBe("all")
    expect(listModeToRefFilter("trash")).toBe("trash")
  })
})
