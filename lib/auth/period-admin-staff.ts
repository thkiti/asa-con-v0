import { BranchType, Role, type PrismaClient } from "@/generated/prisma/client"
import { PeriodAdminAuthError } from "./period-admin"

/** Dev-only period-admin seed — not for bootstrap login (see bootstrap-login.ts). */
export const DEV_PERIOD_ADMIN_STAFF_CODE = "DEV"

const DEV_BRANCH_CODE = "DEV01"
const DEV_STAFF_PASSWORD_STUB = "dev-stub-not-for-login"

async function findActiveStaffId(
  db: PrismaClient,
  sessionStaffKey: string
): Promise<string | null> {
  const key = sessionStaffKey.trim()
  if (!key) return null

  const staff = await db.staff.findFirst({
    where: {
      OR: [{ id: key }, { staffId: key }],
      deleted: false,
    },
    select: { id: true },
  })

  return staff?.id ?? null
}

async function resolveDevStaffBranchId(
  db: PrismaClient,
  branchIdHint?: string
): Promise<string> {
  const hint = branchIdHint?.trim()
  if (hint) {
    const hinted = await db.branch.findFirst({
      where: { id: hint, deleted: false, isActive: true },
      select: { id: true },
    })
    if (hinted) return hinted.id
  }

  const existing = await db.branch.findFirst({
    where: { deleted: false, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  })
  if (existing) return existing.id

  const created = await db.branch.create({
    data: {
      code: DEV_BRANCH_CODE,
      name: "Dev Branch",
      type: BranchType.SH,
      isActive: true,
      deleted: false,
    },
    select: { id: true },
  })
  return created.id
}

export async function ensureDevPeriodAdminStaff(
  db: PrismaClient,
  branchIdHint?: string
): Promise<string> {
  const branchId = await resolveDevStaffBranchId(db, branchIdHint)

  const staff = await db.staff.upsert({
    where: { staffId: DEV_PERIOD_ADMIN_STAFF_CODE },
    create: {
      staffId: DEV_PERIOD_ADMIN_STAFF_CODE,
      name: "Dev Admin",
      role: Role.HO_ADMIN,
      password: DEV_STAFF_PASSWORD_STUB,
      branchId,
      deleted: false,
    },
    update: {
      name: "Dev Admin",
      role: Role.HO_ADMIN,
      deleted: false,
    },
    select: { id: true },
  })

  return staff.id
}

export async function resolvePeriodAdminStaffId(
  db: PrismaClient,
  sessionStaffKey: string,
  options?: { branchIdHint?: string }
): Promise<string> {
  const existingId = await findActiveStaffId(db, sessionStaffKey)
  if (existingId) return existingId

  if (process.env.NODE_ENV !== "development") {
    throw new PeriodAdminAuthError(
      "Staff record not found",
      "STAFF_NOT_FOUND",
      401
    )
  }

  return ensureDevPeriodAdminStaff(db, options?.branchIdHint)
}
