import { Prisma } from "@/generated/prisma/client"
import { Role } from "@/generated/prisma/client"
import { DEV_PERIOD_ADMIN_STAFF_CODE } from "@/lib/auth/period-admin-staff"
import { STAFF_BOOTSTRAP_ADMIN_ID } from "@/lib/import/constants"
import { verifyStaffPassword } from "@/lib/auth/verify-staff-password"
import { createStaff } from "@/lib/master/create-staff"
import { deleteStaff } from "@/lib/master/delete-staff"
import { MasterDomainError } from "@/lib/master/errors"
import {
  parseCreateStaffBody,
  parsePatchStaffBody,
} from "@/lib/master/parse-staff-mutation"
import { resetStaffPassword } from "@/lib/master/reset-staff-password"
import { updateStaff } from "@/lib/master/update-staff"

const hoBranch = {
  id: "branch-ho",
  type: "HO" as const,
  isActive: true,
  deleted: false,
}

const shBranch = {
  id: "branch-sh",
  type: "SH" as const,
  isActive: true,
  deleted: false,
}

function staffRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "staff-1",
    staffId: "002",
    name: "Shop User",
    role: Role.SH_STAFF,
    deleted: false,
    branchId: shBranch.id,
    posCanCollect: false,
    allowAnyBranchLogin: false,
    branch: { code: "SH999", name: "Buffer" },
    ...overrides,
  }
}

describe("parseStaffMutation", () => {
  it("parses create with default password when omitted", () => {
    expect(
      parseCreateStaffBody({
        staffId: "010",
        name: "New User",
        role: "SH_STAFF",
        branchId: shBranch.id,
      })
    ).toMatchObject({
      staffId: "010",
      password: "1234",
      posCanCollect: false,
      allowAnyBranchLogin: false,
    })
  })

  it("parses allowAnyBranchLogin for SH_STAFF", () => {
    expect(
      parseCreateStaffBody({
        staffId: "010",
        name: "Replacer",
        role: "SH_STAFF",
        branchId: shBranch.id,
        allowAnyBranchLogin: true,
      })
    ).toMatchObject({
      allowAnyBranchLogin: true,
    })
  })

  it("forces allowAnyBranchLogin false for non SH_STAFF roles", () => {
    expect(
      parseCreateStaffBody({
        staffId: "010",
        name: "Admin",
        role: "HO_ADMIN",
        branchId: hoBranch.id,
        allowAnyBranchLogin: true,
      })
    ).toMatchObject({
      allowAnyBranchLogin: false,
    })
  })

  it("rejects staffId on patch", () => {
    expect(() =>
      parsePatchStaffBody({
        staffId: "999",
        name: "X",
        role: "SH_STAFF",
        branchId: shBranch.id,
      })
    ).toThrow(expect.objectContaining({ code: "STAFF_ID_IMMUTABLE" }))
  })

  it("parses password-only reset", () => {
    expect(parsePatchStaffBody({ password: "5678" })).toEqual({
      action: "resetPassword",
      password: "5678",
    })
  })

  it("rejects mixed password and profile update", () => {
    expect(() =>
      parsePatchStaffBody({
        password: "5678",
        name: "X",
        role: "SH_STAFF",
        branchId: shBranch.id,
      })
    ).toThrow(expect.objectContaining({ code: "VALIDATION_ERROR" }))
  })
})

describe("createStaff", () => {
  it("creates staff with bcrypt hash", async () => {
    const create = jest.fn().mockResolvedValue(staffRow())
    const db = {
      branch: { findUnique: jest.fn().mockResolvedValue(shBranch) },
      staff: { create },
    }

    await createStaff(db, {
      staffId: "010",
      name: "New",
      role: Role.SH_STAFF,
      branchId: shBranch.id,
      password: "5678",
      posCanCollect: false,
      allowAnyBranchLogin: true,
    })

    const data = create.mock.calls[0][0].data
    expect(data.allowAnyBranchLogin).toBe(true)
    expect(data.password).not.toBe("5678")
    await expect(verifyStaffPassword("5678", data.password)).resolves.toBe(true)
  })

  it("rejects reserved DEV staffId", async () => {
    const db = {
      branch: { findUnique: jest.fn() },
      staff: { create: jest.fn() },
    }
    await expect(
      createStaff(db, {
        staffId: DEV_PERIOD_ADMIN_STAFF_CODE,
        name: "Dev",
        role: Role.HO_ADMIN,
        branchId: hoBranch.id,
        password: "1234",
        posCanCollect: false,
        allowAnyBranchLogin: false,
      })
    ).rejects.toMatchObject({ code: "RESERVED_STAFF_ID" })
  })

  it("allows bootstrap admin 001 when not duplicate", async () => {
    const create = jest.fn().mockResolvedValue(
      staffRow({ staffId: STAFF_BOOTSTRAP_ADMIN_ID, role: Role.HO_ADMIN, branchId: hoBranch.id })
    )
    const db = {
      branch: { findUnique: jest.fn().mockResolvedValue(hoBranch) },
      staff: { create },
    }

    await createStaff(db, {
      staffId: STAFF_BOOTSTRAP_ADMIN_ID,
      name: "Admin",
      role: Role.HO_ADMIN,
      branchId: hoBranch.id,
      password: "1234",
      posCanCollect: false,
      allowAnyBranchLogin: false,
    })
    expect(create).toHaveBeenCalled()
  })

  it("maps duplicate staffId to STAFF_ID_EXISTS", async () => {
    const err = new Prisma.PrismaClientKnownRequestError("dup", {
      code: "P2002",
      clientVersion: "test",
    })
    const db = {
      branch: { findUnique: jest.fn().mockResolvedValue(shBranch) },
      staff: { create: jest.fn().mockRejectedValue(err) },
    }

    await expect(
      createStaff(db, {
        staffId: "002",
        name: "Dup",
        role: Role.SH_STAFF,
        branchId: shBranch.id,
        password: "1234",
        posCanCollect: false,
        allowAnyBranchLogin: false,
      })
    ).rejects.toMatchObject({ code: "STAFF_ID_EXISTS" })
  })

  it("rejects HO_ADMIN on SH branch", async () => {
    const db = {
      branch: { findUnique: jest.fn().mockResolvedValue(shBranch) },
      staff: { create: jest.fn() },
    }

    await expect(
      createStaff(db, {
        staffId: "099",
        name: "Bad",
        role: Role.HO_ADMIN,
        branchId: shBranch.id,
        password: "1234",
        posCanCollect: false,
        allowAnyBranchLogin: false,
      })
    ).rejects.toMatchObject({ code: "ROLE_BRANCH_MISMATCH" })
  })
})

describe("updateStaff", () => {
  it("blocks last HO_ADMIN demotion", async () => {
    const db = {
      branch: { findUnique: jest.fn().mockResolvedValue(shBranch) },
      staff: {
        findUnique: jest.fn().mockResolvedValue({
          id: "staff-admin",
          staffId: "001",
          role: Role.HO_ADMIN,
          branch: hoBranch,
        }),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
    }

    await expect(
      updateStaff(db, "staff-admin", {
        name: "Admin",
        role: Role.SH_STAFF,
        branchId: shBranch.id,
        posCanCollect: false,
        allowAnyBranchLogin: false,
      })
    ).rejects.toMatchObject({ code: "LAST_HO_ADMIN" })
  })

  it("forces allowAnyBranchLogin false when demoting replacer to HO role", async () => {
    const update = jest.fn().mockResolvedValue(staffRow({ role: Role.HO_OPERATIONS }))
    const db = {
      branch: { findUnique: jest.fn().mockResolvedValue(hoBranch) },
      staff: {
        findUnique: jest.fn().mockResolvedValue({
          id: "staff-1",
          staffId: "010",
          role: Role.SH_STAFF,
          branch: shBranch,
        }),
        count: jest.fn(),
        update,
      },
    }

    await updateStaff(db, "staff-1", {
      name: "Ops",
      role: Role.HO_OPERATIONS,
      branchId: hoBranch.id,
      posCanCollect: true,
      allowAnyBranchLogin: true,
    })

    expect(update.mock.calls[0][0].data.allowAnyBranchLogin).toBe(false)
  })

  it("blocks last HO_ADMIN change to HO_FINANCE", async () => {
    const db = {
      branch: { findUnique: jest.fn().mockResolvedValue(hoBranch) },
      staff: {
        findUnique: jest.fn().mockResolvedValue({
          id: "staff-admin",
          staffId: "001",
          role: Role.HO_ADMIN,
          branch: hoBranch,
        }),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
    }

    await expect(
      updateStaff(db, "staff-admin", {
        name: "Admin",
        role: Role.HO_FINANCE,
        branchId: hoBranch.id,
        posCanCollect: false,
        allowAnyBranchLogin: false,
      })
    ).rejects.toMatchObject({ code: "LAST_HO_ADMIN" })
  })

  it("blocks DEV staff update", async () => {
    const db = {
      branch: { findUnique: jest.fn() },
      staff: {
        findUnique: jest.fn().mockResolvedValue({
          id: "dev",
          staffId: DEV_PERIOD_ADMIN_STAFF_CODE,
          role: Role.HO_ADMIN,
          branch: hoBranch,
        }),
        count: jest.fn(),
        update: jest.fn(),
      },
    }

    await expect(
      updateStaff(db, "dev", {
        name: "Dev",
        role: Role.HO_ADMIN,
        branchId: hoBranch.id,
        posCanCollect: false,
        allowAnyBranchLogin: false,
      })
    ).rejects.toMatchObject({ code: "RESERVED_STAFF_ID" })
  })
})

describe("deleteStaff", () => {
  it("protects bootstrap admin 001", async () => {
    const db = {
      staff: {
        findUnique: jest.fn().mockResolvedValue({
          id: "staff-001",
          staffId: STAFF_BOOTSTRAP_ADMIN_ID,
          role: Role.HO_ADMIN,
          branch: hoBranch,
        }),
        count: jest.fn(),
        update: jest.fn(),
      },
    }

    await expect(deleteStaff(db, "staff-001")).rejects.toMatchObject({
      code: "BOOTSTRAP_STAFF_PROTECTED",
    })
  })

  it("allows delete of normal staff 002", async () => {
    const db = {
      staff: {
        findUnique: jest.fn().mockResolvedValue({
          id: "staff-2",
          staffId: "002",
          role: Role.SH_STAFF,
          branch: shBranch,
        }),
        count: jest.fn().mockResolvedValue(1),
        update: jest.fn().mockResolvedValue(staffRow({ deleted: true })),
      },
    }

    const item = await deleteStaff(db, "staff-2")
    expect(item.deleted).toBe(true)
  })

  it("blocks DEV delete", async () => {
    const db = {
      staff: {
        findUnique: jest.fn().mockResolvedValue({
          id: "dev",
          staffId: DEV_PERIOD_ADMIN_STAFF_CODE,
          role: Role.HO_ADMIN,
          branch: hoBranch,
        }),
        count: jest.fn(),
        update: jest.fn(),
      },
    }

    await expect(deleteStaff(db, "dev")).rejects.toMatchObject({
      code: "RESERVED_STAFF_ID",
    })
  })
})

describe("resetStaffPassword", () => {
  it("updates hash without returning password", async () => {
    const update = jest.fn().mockResolvedValue(staffRow())
    const db = {
      staff: {
        findUnique: jest.fn().mockResolvedValue({ id: "staff-1", staffId: "002" }),
        update,
      },
    }

    const item = await resetStaffPassword(db, "staff-1", "newpass")
    expect(item).not.toHaveProperty("password")
    const hash = update.mock.calls[0][0].data.password
    await expect(verifyStaffPassword("newpass", hash)).resolves.toBe(true)
  })

  it("blocks DEV password reset", async () => {
    const db = {
      staff: {
        findUnique: jest.fn().mockResolvedValue({
          id: "dev",
          staffId: DEV_PERIOD_ADMIN_STAFF_CODE,
        }),
        update: jest.fn(),
      },
    }

    await expect(resetStaffPassword(db, "dev", "1234")).rejects.toMatchObject({
      code: "RESERVED_STAFF_ID",
    })
  })
})
