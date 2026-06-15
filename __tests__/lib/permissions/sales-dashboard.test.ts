import {
  canAccessShopSalesDashboard,
  canViewSalesDashboard,
  requireSalesDashboardSession,
  SalesDashboardAuthError,
  SHOP_SALES_DASHBOARD_ASAS_ONLY_MESSAGE,
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
  documentEntityCode: "AS" as const,
}

const hoAdminAsad = { ...hoAdmin, documentEntityCode: "AD" as const }

const hoFinance = { ...hoAdmin, role: "HO_FINANCE" as const }
const hoOps = { ...hoAdmin, role: "HO_OPERATIONS" as const }
const shopStaff = { ...hoAdmin, role: "SH_STAFF" as const }

describe("canAccessShopSalesDashboard", () => {
  it("allows ASAS document entity", () => {
    expect(canAccessShopSalesDashboard("AS")).toBe(true)
  })

  it("denies ASAD document entity", () => {
    expect(canAccessShopSalesDashboard("AD")).toBe(false)
  })
})

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

  it("throws for ASAD entity with shop-sales-only message", () => {
    expect(() => requireSalesDashboardSession(hoAdminAsad)).toThrow(
      SalesDashboardAuthError
    )
    try {
      requireSalesDashboardSession(hoAdminAsad)
    } catch (err) {
      expect(err).toBeInstanceOf(SalesDashboardAuthError)
      expect((err as SalesDashboardAuthError).message).toBe(
        SHOP_SALES_DASHBOARD_ASAS_ONLY_MESSAGE
      )
      expect((err as SalesDashboardAuthError).code).toBe(
        "SHOP_SALES_ENTITY_FORBIDDEN"
      )
    }
  })
})
