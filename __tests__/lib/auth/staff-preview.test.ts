import { DEV_PERIOD_ADMIN_STAFF_CODE } from "@/lib/auth/period-admin-staff"
import {
  LoginPreviewError,
  LOGIN_PREVIEW_NOT_FOUND_MESSAGE,
} from "@/lib/auth/login-preview"
import { previewStaffByStaffId } from "@/lib/auth/staff-preview"

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    staff: {
      findUnique: jest.fn(),
    },
  },
}))

import { prisma } from "@/lib/shared/prisma"

describe("previewStaffByStaffId", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns staff and branch fields without role or password", async () => {
    jest.mocked(prisma.staff.findUnique).mockResolvedValue({
      staffId: "001",
      name: "Admin User",
      deleted: false,
      allowAnyBranchLogin: true,
      branch: {
        id: "branch-ho",
        code: "HO999",
        name: "Head Office",
        isActive: true,
        deleted: false,
      },
    } as never)

    const result = await previewStaffByStaffId("001")

    expect(result).toEqual({
      staffId: "001",
      staffName: "Admin User",
      branchId: "branch-ho",
      branchCode: "HO999",
      branchName: "Head Office",
      allowAnyBranchLogin: true,
    })
    expect(result).not.toHaveProperty("role")
    expect(result).not.toHaveProperty("password")

    const select = jest.mocked(prisma.staff.findUnique).mock.calls[0][0]?.select
    expect(select).toBeDefined()
    expect(select).not.toHaveProperty("role")
    expect(select).not.toHaveProperty("password")
  })

  it("rejects deleted staff with NOT_FOUND", async () => {
    jest.mocked(prisma.staff.findUnique).mockResolvedValue({
      staffId: "001",
      name: "Admin",
      deleted: true,
      branch: {
        id: "b1",
        code: "HO999",
        name: "HO",
        isActive: true,
        deleted: false,
      },
    } as never)

    await expect(previewStaffByStaffId("001")).rejects.toMatchObject({
      message: LOGIN_PREVIEW_NOT_FOUND_MESSAGE,
      code: "NOT_FOUND",
      httpStatus: 404,
    })
    await expect(previewStaffByStaffId("001")).rejects.toBeInstanceOf(
      LoginPreviewError
    )
  })

  it("rejects missing staff with NOT_FOUND", async () => {
    jest.mocked(prisma.staff.findUnique).mockResolvedValue(null)

    await expect(previewStaffByStaffId("999")).rejects.toMatchObject({
      code: "NOT_FOUND",
      httpStatus: 404,
    })
  })

  it("rejects DEV staff with NOT_FOUND", async () => {
    await expect(
      previewStaffByStaffId(DEV_PERIOD_ADMIN_STAFF_CODE)
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(prisma.staff.findUnique).not.toHaveBeenCalled()
  })

  it("rejects inactive staff branch with NOT_FOUND", async () => {
    jest.mocked(prisma.staff.findUnique).mockResolvedValue({
      staffId: "001",
      name: "Admin",
      deleted: false,
      allowAnyBranchLogin: true,
      branch: {
        id: "b1",
        code: "HO999",
        name: "HO",
        isActive: false,
        deleted: false,
      },
    } as never)

    await expect(previewStaffByStaffId("001")).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })
})
