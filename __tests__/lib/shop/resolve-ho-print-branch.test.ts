import { resolveHoPrintBranchId } from "@/lib/shop/resolve-ho-print-branch"

const hoAdmin = {
  sessionId: "s1",
  userId: "u1",
  role: "HO_ADMIN" as const,
  staffId: "001",
  name: "Admin",
  branchId: "session-branch",
  branchCode: "HO999",
  branchName: "HO",
}

const shopStaff = { ...hoAdmin, role: "SH_STAFF" as const, branchId: "shop-branch" }

describe("resolveHoPrintBranchId", () => {
  it("uses query branchId for HO roles", () => {
    expect(resolveHoPrintBranchId(hoAdmin, "remote-branch")).toBe("remote-branch")
  })

  it("falls back to session branch for HO when query missing", () => {
    expect(resolveHoPrintBranchId(hoAdmin, "")).toBe("session-branch")
    expect(resolveHoPrintBranchId(hoAdmin)).toBe("session-branch")
  })

  it("ignores query branchId for SH_STAFF", () => {
    expect(resolveHoPrintBranchId(shopStaff, "remote-branch")).toBe("shop-branch")
  })
})
