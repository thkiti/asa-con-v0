import {
  refFilterToActiveOnly,
  refFilterToListMode,
} from "@/components/master/branch/BranchFilterBar"

describe("BranchFilterBar mode helpers", () => {
  it("maps ref filter to list mode", () => {
    expect(refFilterToListMode("all")).toBe("active")
    expect(refFilterToListMode("active")).toBe("active")
    expect(refFilterToListMode("trash")).toBe("trash")
  })

  it("maps ref filter to activeOnly", () => {
    expect(refFilterToActiveOnly("all")).toBe(false)
    expect(refFilterToActiveOnly("active")).toBe(true)
    expect(refFilterToActiveOnly("trash")).toBe(false)
  })
})
