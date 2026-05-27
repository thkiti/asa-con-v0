import { Role } from "@/generated/prisma/client"
import {
  DEV_PERIOD_ADMIN_STAFF_CODE,
  ensureDevPeriodAdminStaff,
  resolvePeriodAdminStaffId,
} from "@/lib/auth/period-admin-staff"

function makeDb() {
  return {
    staff: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    branch: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  }
}

describe("resolvePeriodAdminStaffId", () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    jest.resetAllMocks()
  })

  it("returns matching staff id when session key exists", async () => {
    const db = makeDb()
    db.staff.findFirst.mockResolvedValue({ id: "cuid-abc" })

    await expect(
      resolvePeriodAdminStaffId(db as never, "finance-1")
    ).resolves.toBe("cuid-abc")

    expect(db.staff.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ id: "finance-1" }, { staffId: "finance-1" }],
        deleted: false,
      },
      select: { id: true },
    })
    expect(db.staff.upsert).not.toHaveBeenCalled()
  })

  it("throws STAFF_NOT_FOUND outside development", async () => {
    process.env.NODE_ENV = "production"
    const db = makeDb()
    db.staff.findFirst.mockResolvedValue(null)

    await expect(resolvePeriodAdminStaffId(db as never, "missing")).rejects.toMatchObject({
      message: "Staff record not found",
      code: "STAFF_NOT_FOUND",
      httpStatus: 401,
    })
    expect(db.staff.upsert).not.toHaveBeenCalled()
  })

  it("upserts DEV staff in development when session key is missing", async () => {
    process.env.NODE_ENV = "development"
    const db = makeDb()
    db.staff.findFirst.mockResolvedValue(null)
    db.branch.findFirst.mockResolvedValue({ id: "branch-1" })
    db.staff.upsert.mockResolvedValue({ id: "dev-cuid" })

    await expect(
      resolvePeriodAdminStaffId(db as never, "cookie-only", {
        branchIdHint: "branch-1",
      })
    ).resolves.toBe("dev-cuid")

    expect(db.staff.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { staffId: DEV_PERIOD_ADMIN_STAFF_CODE },
        create: expect.objectContaining({
          staffId: DEV_PERIOD_ADMIN_STAFF_CODE,
          name: "Dev Admin",
          role: Role.HO_ADMIN,
          branchId: "branch-1",
        }),
      })
    )
  })
})

describe("ensureDevPeriodAdminStaff", () => {
  it("reuses existing branch before creating DEV01", async () => {
    const db = makeDb()
    db.branch.findFirst.mockResolvedValue({ id: "branch-existing" })
    db.staff.upsert.mockResolvedValue({ id: "dev-id" })

    await expect(ensureDevPeriodAdminStaff(db as never)).resolves.toBe("dev-id")
    expect(db.branch.create).not.toHaveBeenCalled()
  })
})
