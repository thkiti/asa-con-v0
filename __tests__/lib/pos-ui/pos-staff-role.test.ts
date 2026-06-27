import { isPosHoStaffRole } from "@/lib/pos-ui/pos-staff-role"

describe("isPosHoStaffRole", () => {
  it("treats HO roles as collector-eligible", () => {
    expect(isPosHoStaffRole("HO_ADMIN")).toBe(true)
    expect(isPosHoStaffRole("HO_FINANCE")).toBe(true)
    expect(isPosHoStaffRole("HO_OPERATIONS")).toBe(true)
  })

  it("excludes shop floor staff", () => {
    expect(isPosHoStaffRole("SH_STAFF")).toBe(false)
  })
})
