import {
  canAccessMasterDatabase,
  canAccessProductReference,
  MasterDatabaseAuthError,
  requireMasterDatabaseSession,
  requireProductReferenceSession,
} from "@/lib/permissions/master"
import type { SessionUser } from "@/lib/auth/types"

const hoAdmin: SessionUser = {
  sessionId: "s1",
  userId: "u1",
  role: "HO_ADMIN",
  staffId: "001",
  name: "Admin",
  branchId: "b1",
  branchCode: "HO999",
  branchName: "HO",
}

describe("canAccessMasterDatabase", () => {
  it("allows HO_ADMIN only", () => {
    expect(canAccessMasterDatabase("HO_ADMIN")).toBe(true)
    expect(canAccessMasterDatabase("HO_FINANCE")).toBe(false)
    expect(canAccessMasterDatabase("HO_OPERATIONS")).toBe(false)
    expect(canAccessMasterDatabase("SH_STAFF")).toBe(false)
    expect(canAccessMasterDatabase(null)).toBe(false)
  })
})

describe("canAccessProductReference", () => {
  it("allows HO_ADMIN and HO_OPERATIONS", () => {
    expect(canAccessProductReference("HO_ADMIN")).toBe(true)
    expect(canAccessProductReference("HO_OPERATIONS")).toBe(true)
    expect(canAccessProductReference("HO_FINANCE")).toBe(false)
    expect(canAccessProductReference("SH_STAFF")).toBe(false)
  })
})

describe("requireMasterDatabaseSession", () => {
  it("returns session for HO_ADMIN", () => {
    expect(requireMasterDatabaseSession(hoAdmin)).toBe(hoAdmin)
  })

  it("throws 401 when session is null", () => {
    expect(() => requireMasterDatabaseSession(null)).toThrow(MasterDatabaseAuthError)
    try {
      requireMasterDatabaseSession(null)
    } catch (err) {
      expect(err).toMatchObject({ code: "UNAUTHENTICATED", httpStatus: 401 })
    }
  })

  it("throws 403 for SH_STAFF", () => {
    expect(() =>
      requireMasterDatabaseSession({ ...hoAdmin, role: "SH_STAFF" })
    ).toThrow(MasterDatabaseAuthError)
    try {
      requireMasterDatabaseSession({ ...hoAdmin, role: "SH_STAFF" })
    } catch (err) {
      expect(err).toMatchObject({ code: "FORBIDDEN", httpStatus: 403 })
    }
  })
})

describe("requireProductReferenceSession", () => {
  it("returns session for HO_OPERATIONS", () => {
    const hoOps = { ...hoAdmin, role: "HO_OPERATIONS" as const }
    expect(requireProductReferenceSession(hoOps)).toBe(hoOps)
  })

  it("throws 403 for HO_FINANCE", () => {
    expect(() =>
      requireProductReferenceSession({ ...hoAdmin, role: "HO_FINANCE" })
    ).toThrow(MasterDatabaseAuthError)
    try {
      requireProductReferenceSession({ ...hoAdmin, role: "HO_FINANCE" })
    } catch (err) {
      expect(err).toMatchObject({ code: "FORBIDDEN", httpStatus: 403 })
    }
  })
})
