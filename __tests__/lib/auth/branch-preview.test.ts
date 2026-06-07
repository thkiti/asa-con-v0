import {
  LoginPreviewError,
  LOGIN_PREVIEW_NOT_FOUND_MESSAGE,
} from "@/lib/auth/login-preview"
import { previewBranchByCode } from "@/lib/auth/branch-preview"

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    branch: {
      findUnique: jest.fn(),
    },
  },
}))

import { prisma } from "@/lib/shared/prisma"

describe("previewBranchByCode", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns branch fields for active branch", async () => {
    jest.mocked(prisma.branch.findUnique).mockResolvedValue({
      id: "branch-ho",
      code: "HO999",
      name: "Head Office",
      type: "HO",
      isActive: true,
      deleted: false,
    } as never)

    const result = await previewBranchByCode("HO999")

    expect(result).toEqual({
      branchId: "branch-ho",
      branchCode: "HO999",
      branchName: "Head Office",
      branchType: "HO",
    })
    expect(result).not.toHaveProperty("role")
  })

  it("rejects deleted branch with NOT_FOUND", async () => {
    jest.mocked(prisma.branch.findUnique).mockResolvedValue({
      id: "b1",
      code: "X01",
      name: "X",
      isActive: true,
      deleted: true,
    } as never)

    await expect(previewBranchByCode("X01")).rejects.toMatchObject({
      message: LOGIN_PREVIEW_NOT_FOUND_MESSAGE,
      code: "NOT_FOUND",
      httpStatus: 404,
    })
    await expect(previewBranchByCode("X01")).rejects.toBeInstanceOf(
      LoginPreviewError
    )
  })

  it("rejects inactive branch with NOT_FOUND", async () => {
    jest.mocked(prisma.branch.findUnique).mockResolvedValue({
      id: "b1",
      code: "X01",
      name: "X",
      isActive: false,
      deleted: false,
    } as never)

    await expect(previewBranchByCode("X01")).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })

  it("rejects unknown branch with NOT_FOUND", async () => {
    jest.mocked(prisma.branch.findUnique).mockResolvedValue(null)

    await expect(previewBranchByCode("NONE")).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
  })
})
