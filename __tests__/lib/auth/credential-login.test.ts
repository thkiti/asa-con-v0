import bcrypt from "bcryptjs"

import {
  credentialLogin,
  CredentialLoginError,
  CREDENTIAL_LOGIN_BRANCH_INACTIVE_MESSAGE,
  CREDENTIAL_LOGIN_BRANCH_MISMATCH_MESSAGE,
  CREDENTIAL_LOGIN_INVALID_MESSAGE,
} from "@/lib/auth/credential-login"
import { getDefaultStaffPasswordHash } from "@/lib/import/staff-password"

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    staff: {
      findUnique: jest.fn(),
    },
  },
}))

import { prisma } from "@/lib/shared/prisma"

const validPasswordHashPromise = getDefaultStaffPasswordHash()

async function activeStaffRecord(overrides: {
  password?: string
  deleted?: boolean
  branch?: {
    id: string
    code: string
    name: string
    isActive: boolean
    deleted: boolean
  }
} = {}) {
  return {
    id: "staff-internal-1",
    staffId: "001",
    name: "Admin User",
    role: "HO_ADMIN",
    branchId: "branch-ho",
    password: overrides.password ?? (await validPasswordHashPromise),
    deleted: overrides.deleted ?? false,
    createdAt: new Date(),
    updatedAt: new Date(),
    branch: overrides.branch ?? {
      id: "branch-ho",
      code: "HO999",
      name: "Head Office",
      isActive: true,
      deleted: false,
    },
  }
}

describe("credentialLogin", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns SessionUser with branch fields on valid password", async () => {
    jest
      .mocked(prisma.staff.findUnique)
      .mockResolvedValue((await activeStaffRecord()) as never)

    const result = await credentialLogin({
      username: "001",
      password: "1234",
      branchCode: "HO999",
    })

    expect(result.sessionUser).toEqual({
      sessionId: expect.any(String),
      userId: "staff-internal-1",
      role: "HO_ADMIN",
      staffId: "001",
      name: "Admin User",
      branchId: "branch-ho",
      branchCode: "HO999",
      branchName: "Head Office",
    })
    expect(result.redirectTo).toBe("/main")
  })

  it("rejects wrong password with generic invalid credentials", async () => {
    jest
      .mocked(prisma.staff.findUnique)
      .mockResolvedValue((await activeStaffRecord()) as never)

    await expect(
      credentialLogin({ username: "001", password: "wrong", branchCode: "HO999" })
    ).rejects.toMatchObject({
      message: CREDENTIAL_LOGIN_INVALID_MESSAGE,
      code: "INVALID_CREDENTIALS",
      httpStatus: 401,
    })
  })

  it("rejects missing staff with generic invalid credentials", async () => {
    jest.mocked(prisma.staff.findUnique).mockResolvedValue(null)

    await expect(
      credentialLogin({ username: "999", password: "1234", branchCode: "HO999" })
    ).rejects.toMatchObject({
      message: CREDENTIAL_LOGIN_INVALID_MESSAGE,
      code: "INVALID_CREDENTIALS",
      httpStatus: 401,
    })
  })

  it("rejects deleted staff with generic invalid credentials", async () => {
    jest
      .mocked(prisma.staff.findUnique)
      .mockResolvedValue(
        (await activeStaffRecord({ deleted: true })) as never
      )

    await expect(
      credentialLogin({ username: "001", password: "1234", branchCode: "HO999" })
    ).rejects.toMatchObject({
      message: CREDENTIAL_LOGIN_INVALID_MESSAGE,
      code: "INVALID_CREDENTIALS",
      httpStatus: 401,
    })
  })

  it("rejects branch code mismatch before password check", async () => {
    jest
      .mocked(prisma.staff.findUnique)
      .mockResolvedValue((await activeStaffRecord()) as never)

    await expect(
      credentialLogin({
        username: "001",
        password: "1234",
        branchCode: "SH001",
      })
    ).rejects.toMatchObject({
      message: CREDENTIAL_LOGIN_BRANCH_MISMATCH_MESSAGE,
      code: "BRANCH_MISMATCH",
      httpStatus: 403,
    })
  })

  it("rejects missing branch code", async () => {
    await expect(
      credentialLogin({ username: "001", password: "1234", branchCode: "" })
    ).rejects.toMatchObject({
      code: "BRANCH_CODE_REQUIRED",
      httpStatus: 400,
    })
    expect(prisma.staff.findUnique).not.toHaveBeenCalled()
  })

  it("rejects inactive branch", async () => {
    jest.mocked(prisma.staff.findUnique).mockResolvedValue(
      (await activeStaffRecord({
        branch: {
          id: "branch-ho",
          code: "HO999",
          name: "Head Office",
          isActive: false,
          deleted: false,
        },
      })) as never
    )

    await expect(
      credentialLogin({ username: "001", password: "1234", branchCode: "HO999" })
    ).rejects.toMatchObject({
      message: CREDENTIAL_LOGIN_BRANCH_INACTIVE_MESSAGE,
      code: "BRANCH_INACTIVE",
      httpStatus: 409,
    })
  })

  it("rejects deleted branch", async () => {
    jest.mocked(prisma.staff.findUnique).mockResolvedValue(
      (await activeStaffRecord({
        branch: {
          id: "branch-ho",
          code: "HO999",
          name: "Head Office",
          isActive: true,
          deleted: true,
        },
      })) as never
    )

    await expect(
      credentialLogin({ username: "001", password: "1234", branchCode: "HO999" })
    ).rejects.toMatchObject({
      message: CREDENTIAL_LOGIN_BRANCH_INACTIVE_MESSAGE,
      code: "BRANCH_INACTIVE",
      httpStatus: 409,
    })
  })

  it("rejects empty password", async () => {
    await expect(
      credentialLogin({ username: "001", password: "", branchCode: "HO999" })
    ).rejects.toMatchObject({
      code: "PASSWORD_REQUIRED",
      httpStatus: 400,
    })
    expect(prisma.staff.findUnique).not.toHaveBeenCalled()
  })

  it("rejects empty username", async () => {
    await expect(
      credentialLogin({ username: "  ", password: "1234", branchCode: "HO999" })
    ).rejects.toMatchObject({
      code: "USERNAME_REQUIRED",
      httpStatus: 400,
    })
    expect(prisma.staff.findUnique).not.toHaveBeenCalled()
  })

  it("throws CredentialLoginError type", async () => {
    jest.mocked(prisma.staff.findUnique).mockResolvedValue(null)
    await expect(
      credentialLogin({ username: "001", password: "1234", branchCode: "HO999" })
    ).rejects.toBeInstanceOf(CredentialLoginError)
  })

  it("uses returnTo when safe instead of default /main", async () => {
    jest
      .mocked(prisma.staff.findUnique)
      .mockResolvedValue((await activeStaffRecord()) as never)

    const result = await credentialLogin({
      username: "001",
      password: "1234",
      branchCode: "HO999",
      returnTo: "/shop/stock-documents",
    })

    expect(result.redirectTo).toBe("/shop/stock-documents")
  })

  it("accepts custom password hash via bcrypt.compare", async () => {
    const customHash = await bcrypt.hash("secret-pass", 10)
    jest.mocked(prisma.staff.findUnique).mockResolvedValue(
      (await activeStaffRecord({ password: customHash })) as never
    )

    const result = await credentialLogin({
      username: "001",
      password: "secret-pass",
      branchCode: "HO999",
    })

    expect(result.sessionUser.staffId).toBe("001")
  })
})
