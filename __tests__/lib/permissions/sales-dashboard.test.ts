import {
  canViewSalesDashboard,
  requireSalesDashboardSession,
  SalesDashboardAuthError,
} from "@/lib/permissions/sales-dashboard"

const hoAdmin = {
  sessionId: "s1",
  userId: "u1",
  role: "HO_ADMIN" as const,
  staffId: "001",
  name: "Admin",
  branchId: "b1",
  branchCode: "HO999",
  branchName: "HO",
}

const hoFinance = { ...hoAdmin, role: "HO_FINANCE" as const }
const hoOps = { ...hoAdmin, role: "HO_OPERATIONS" as const }
const shopStaff = { ...hoAdmin, role: "SH_STAFF" as const }

describe("canViewSalesDashboard", () => {
  it("allows HO roles", () => {
    expect(canViewSalesDashboard("HO_ADMIN")).toBe(true)
    expect(canViewSalesDashboard("HO_FINANCE")).toBe(true)
    expect(canViewSalesDashboard("HO_OPERATIONS")).toBe(true)
  })

  it("denies SH_STAFF", () => {
    expect(canViewSalesDashboard("SH_STAFF")).toBe(false)
  })
})

describe("requireSalesDashboardSession", () => {
  it("returns session for HO_OPERATIONS", () => {
    expect(requireSalesDashboardSession(hoOps)).toBe(hoOps)
  })

  it("throws for SH_STAFF", () => {
    expect(() => requireSalesDashboardSession(shopStaff)).toThrow(
      SalesDashboardAuthError
    )
  })

  it("throws when session is null", () => {
    expect(() => requireSalesDashboardSession(null)).toThrow(
      SalesDashboardAuthError
    )
  })
})
