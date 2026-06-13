import {
  formatBranchFilterLabel,
  refFilterToListMode,
} from "@/components/master/staff/StaffFilterBar"

describe("StaffFilterBar mode helpers", () => {
  it("maps ref filter to list mode", () => {
    expect(refFilterToListMode("all")).toBe("active")
    expect(refFilterToListMode("active")).toBe("active")
    expect(refFilterToListMode("trash")).toBe("trash")
  })
})

describe("formatBranchFilterLabel", () => {
  it("formats branch code and name with bullet separator", () => {
    expect(
      formatBranchFilterLabel({ code: "HO999", name: "Head Office" })
    ).toBe("HO999 • Head Office")
    expect(formatBranchFilterLabel({ code: "SH001", name: "Chidlom" })).toBe(
      "SH001 • Chidlom"
    )
  })
})
