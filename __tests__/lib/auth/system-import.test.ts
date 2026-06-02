import { requireSystemImportActor } from "@/lib/auth/system-import"

describe("requireSystemImportActor", () => {
  it("accepts HO_ADMIN session", () => {
    expect(
      requireSystemImportActor({
        sessionId: "s1",
        role: "HO_ADMIN",
        staffId: "001",
        name: "Admin",
        branchId: "branch-1",
      })
    ).toEqual({ staffId: "001", role: "HO_ADMIN" })
  })

  it("rejects HO_FINANCE", () => {
    expect(() =>
      requireSystemImportActor({
        sessionId: "s1",
        role: "HO_FINANCE",
        staffId: "153",
        name: "Finance",
        branchId: "branch-1",
      })
    ).toThrow(/HO_ADMIN/)
  })
})
