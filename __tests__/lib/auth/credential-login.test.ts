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
    branch: {
      findUnique: jest.fn(),
    },
  },
}))

import { prisma } from "@/lib/shared/prisma"

const validPasswordHashPromise = getDefaultStaffPasswordHash()

function loginBranch(overrides: Record<string, unknown> = {}) {
  return {
    id: "branch-ho",
    code: "HO999",
    name: "Head Office",
    type: "HO",
    isActive: true,
    deleted: false,
    ...overrides,
  }
}

function shopLoginBranch(overrides: Record<string, unknown> = {}) {
  return loginBranch({
    id: "branch-sh-1",
    code: "SH001",
    name: "Shop 1",
    type: "SH",
    ...overrides,
  })
}

async function activeStaffRecord(overrides: {
  password?: string
  deleted?: boolean
  role?: string
  branchId?: string
  allowAnyBranchLogin?: boolean
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
    role: overrides.role ?? "HO_ADMIN",
    branchId: overrides.branchId ?? "branch-ho",
    password: overrides.password ?? (await validPasswordHashPromise),
    deleted: overrides.deleted ?? false,
    allowAnyBranchLogin: overrides.allowAnyBranchLogin ?? false,
    posCanCollect: false,
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
    jest
      .mocked(prisma.branch.findUnique)
      .mockResolvedValue(shopLoginBranch() as never)
  })

  it("returns SessionUser with selected shop branch fields on valid password", async () => {
    jest
      .mocked(prisma.staff.findUnique)
      .mockResolvedValue((await activeStaffRecord()) as never)

    const result = await credentialLogin({
      username: "001",
      password: "1234",
      branchCode: "SH001",
    })

    expect(result.sessionUser).toEqual({
      sessionId: expect.any(String),
      userId: "staff-internal-1",
      role: "HO_ADMIN",
      staffId: "001",
      name: "Admin User",
      branchId: "branch-sh-1",
      branchCode: "SH001",
      branchName: "Shop 1",
    })
    expect(result.redirectTo).toBe("/main")
  })

  it("rejects wrong password with generic invalid credentials", async () => {
    jest
      .mocked(prisma.staff.findUnique)
      .mockResolvedValue((await activeStaffRecord()) as never)

    await expect(
      credentialLogin({ username: "001", password: "wrong", branchCode: "SH001" })
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

  it("allows HO_ADMIN to login to active shop branch", async () => {
    jest
      .mocked(prisma.staff.findUnique)
      .mockResolvedValue((await activeStaffRecord()) as never)

    const result = await credentialLogin({
      username: "001",
      password: "1234",
      branchCode: "SH001",
    })

    expect(result.sessionUser.branchCode).toBe("SH001")
  })

  it("rejects HO_ADMIN on HO home branch", async () => {
    jest
      .mocked(prisma.staff.findUnique)
      .mockResolvedValue((await activeStaffRecord()) as never)
    jest.mocked(prisma.branch.findUnique).mockResolvedValue(loginBranch() as never)

    await expect(
      credentialLogin({
        username: "001",
        password: "1234",
        branchCode: "HO999",
      })
    ).rejects.toMatchObject({
      message: CREDENTIAL_LOGIN_BRANCH_MISMATCH_MESSAGE,
      code: "BRANCH_MISMATCH",
      httpStatus: 403,
    })
  })

  it("allows replacer SH_STAFF to login to another active shop branch", async () => {
    jest.mocked(prisma.staff.findUnique).mockResolvedValue(
      (await activeStaffRecord({
        role: "SH_STAFF",
        staffId: "002",
        branchId: "branch-sh-home",
        allowAnyBranchLogin: true,
        branch: {
          id: "branch-sh-home",
          code: "SH999",
          name: "Buffer",
          isActive: true,
          deleted: false,
        },
      })) as never
    )
    jest.mocked(prisma.branch.findUnique).mockResolvedValue(
      loginBranch({
        id: "branch-sh-1",
        code: "SH001",
        name: "Shop 1",
        type: "SH",
      }) as never
    )

    const result = await credentialLogin({
      username: "002",
      password: "1234",
      branchCode: "SH001",
    })

    expect(result.sessionUser.branchId).toBe("branch-sh-1")
    expect(result.sessionUser.branchCode).toBe("SH001")
    expect(result.sessionUser.branchName).toBe("Shop 1")
  })

  it("rejects replacer on inactive shop branch", async () => {
    jest.mocked(prisma.staff.findUnique).mockResolvedValue(
      (await activeStaffRecord({
        role: "SH_STAFF",
        branchId: "branch-sh-home",
        allowAnyBranchLogin: true,
        branch: {
          id: "branch-sh-home",
          code: "SH999",
          name: "Buffer",
          isActive: true,
          deleted: false,
        },
      })) as never
    )
    jest.mocked(prisma.branch.findUnique).mockResolvedValue(
      loginBranch({
        id: "branch-sh-1",
        code: "SH001",
        name: "Shop 1",
        type: "SH",
        isActive: false,
      }) as never
    )

    await expect(
      credentialLogin({
        username: "001",
        password: "1234",
        branchCode: "SH001",
      })
    ).rejects.toMatchObject({
      code: "BRANCH_MISMATCH",
      httpStatus: 403,
    })
  })

  it("rejects replacer on HO branch", async () => {
    jest.mocked(prisma.staff.findUnique).mockResolvedValue(
      (await activeStaffRecord({
        role: "SH_STAFF",
        branchId: "branch-sh-home",
        allowAnyBranchLogin: true,
        branch: {
          id: "branch-sh-home",
          code: "SH999",
          name: "Buffer",
          isActive: true,
          deleted: false,
        },
      })) as never
    )
    jest.mocked(prisma.branch.findUnique).mockResolvedValue(loginBranch() as never)

    await expect(
      credentialLogin({
        username: "001",
        password: "1234",
        branchCode: "HO999",
      })
    ).rejects.toMatchObject({
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

  it("rejects inactive home branch", async () => {
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

  it("rejects deleted home branch", async () => {
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
      branchCode: "SH001",
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
      branchCode: "SH001",
    })

    expect(result.sessionUser.staffId).toBe("001")
  })
})
