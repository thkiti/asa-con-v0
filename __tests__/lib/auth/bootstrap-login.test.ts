import { bootstrapLogin, BootstrapLoginError } from "@/lib/auth/bootstrap-login"

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    staff: {
      findUnique: jest.fn(),
    },
  },
}))

import { prisma } from "@/lib/shared/prisma"

describe("bootstrapLogin", () => {
  it("returns staff view without role field", async () => {
    jest.mocked(prisma.staff.findUnique).mockResolvedValue({
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
    } as never)

    const result = await bootstrapLogin({ staffId: "001" })
    expect(result.staff).toEqual({
      staffId: "001",
      name: "Admin User",
      branchCode: "HO999",
      branchName: "Head Office",
      status: "active",
    })
    expect(result.sessionUser.role).toBe("HO_ADMIN")
    expect(result.redirectTo).toBe("/shop/stock-documents")
  })

  it("supports HO_ADMIN returnTo for system import", async () => {
    jest.mocked(prisma.staff.findUnique).mockResolvedValue({
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
    } as never)

    const result = await bootstrapLogin({
      staffId: "001",
      returnTo: "/system/import",
    })
    expect(result.redirectTo).toBe("/system/import")
  })

  it("throws when staff is missing", async () => {
    jest.mocked(prisma.staff.findUnique).mockResolvedValue(null)
    await expect(bootstrapLogin({ staffId: "999" })).rejects.toBeInstanceOf(
      BootstrapLoginError
    )
  })
})
