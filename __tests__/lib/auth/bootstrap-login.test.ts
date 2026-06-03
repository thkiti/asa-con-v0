import {
  bootstrapLogin,
  BootstrapLoginError,
  BOOTSTRAP_LOGIN_DEV_STAFF_BLOCKED_MESSAGE,
  BOOTSTRAP_LOGIN_STAFF_NOT_FOUND_MESSAGE,
} from "@/lib/auth/bootstrap-login"

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    staff: {
      findUnique: jest.fn(),
    },
  },
}))

import { prisma } from "@/lib/shared/prisma"

const importedAdminStaff = {
  id: "staff-1",
  staffId: "001",
  name: "Admin User",
  role: "HO_ADMIN",
  branchId: "branch-ho",
  password: "stub",
  deleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  branch: {
    id: "branch-ho",
    code: "HO999",
    name: "Head Office",
    isActive: true,
    deleted: false,
  },
}

describe("bootstrapLogin", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns staff view without role field after staff import", async () => {
    jest.mocked(prisma.staff.findUnique).mockResolvedValue(importedAdminStaff as never)

    const result = await bootstrapLogin({ staffId: "001" })
    expect(result.staff).toEqual({
      staffId: "001",
      name: "Admin User",
      branchCode: "HO999",
      branchName: "Head Office",
      status: "active",
    })
    expect(result.sessionUser.role).toBe("HO_ADMIN")
    expect(result.redirectTo).toBe("/main")
  })

  it("supports HO_ADMIN returnTo for system import", async () => {
    jest.mocked(prisma.staff.findUnique).mockResolvedValue(importedAdminStaff as never)

    const result = await bootstrapLogin({
      staffId: "001",
      returnTo: "/system/import",
    })
    expect(result.redirectTo).toBe("/system/import")
  })

  it("fails before staff import with Thai not-found message", async () => {
    jest.mocked(prisma.staff.findUnique).mockResolvedValue(null)

    await expect(bootstrapLogin({ staffId: "001" })).rejects.toMatchObject({
      message: BOOTSTRAP_LOGIN_STAFF_NOT_FOUND_MESSAGE,
      code: "STAFF_NOT_FOUND",
      httpStatus: 404,
    })
  })

  it("blocks DEV seed from bootstrap login", async () => {
    await expect(bootstrapLogin({ staffId: "DEV" })).rejects.toMatchObject({
      message: BOOTSTRAP_LOGIN_DEV_STAFF_BLOCKED_MESSAGE,
      code: "DEV_STAFF_NOT_ALLOWED",
      httpStatus: 403,
    })
    expect(prisma.staff.findUnique).not.toHaveBeenCalled()
  })

  it("throws BootstrapLoginError when staff is missing", async () => {
    jest.mocked(prisma.staff.findUnique).mockResolvedValue(null)
    await expect(bootstrapLogin({ staffId: "999" })).rejects.toBeInstanceOf(
      BootstrapLoginError
    )
  })
})
