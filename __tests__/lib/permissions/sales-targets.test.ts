import {
  canEditSalesTargets,
  canViewSalesTargets,
  requireSalesTargetEditSession,
  requireSalesTargetViewSession,
  SalesTargetAuthError,
} from "@/lib/permissions/sales-targets"

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

describe("canViewSalesTargets", () => {
  it("allows HO roles", () => {
    expect(canViewSalesTargets("HO_ADMIN")).toBe(true)
    expect(canViewSalesTargets("HO_FINANCE")).toBe(true)
    expect(canViewSalesTargets("HO_OPERATIONS")).toBe(true)
  })

  it("denies SH_STAFF", () => {
    expect(canViewSalesTargets("SH_STAFF")).toBe(false)
  })
})

describe("canEditSalesTargets", () => {
  it("allows HO_ADMIN and HO_FINANCE", () => {
    expect(canEditSalesTargets("HO_ADMIN")).toBe(true)
    expect(canEditSalesTargets("HO_FINANCE")).toBe(true)
  })

  it("denies HO_OPERATIONS and SH_STAFF", () => {
    expect(canEditSalesTargets("HO_OPERATIONS")).toBe(false)
    expect(canEditSalesTargets("SH_STAFF")).toBe(false)
  })
})

describe("requireSalesTargetViewSession", () => {
  it("returns session for HO_OPERATIONS", () => {
    expect(requireSalesTargetViewSession(hoOps)).toBe(hoOps)
  })

  it("throws for SH_STAFF", () => {
    expect(() => requireSalesTargetViewSession(shopStaff)).toThrow(
      SalesTargetAuthError
    )
  })
})

describe("requireSalesTargetEditSession", () => {
  it("allows HO_FINANCE", () => {
    expect(requireSalesTargetEditSession(hoFinance)).toBe(hoFinance)
  })

  it("denies HO_OPERATIONS", () => {
    expect(() => requireSalesTargetEditSession(hoOps)).toThrow(
      SalesTargetAuthError
    )
  })
})
