import type { PrismaClient, Role } from "@/generated/prisma/client"
import { DEV_PERIOD_ADMIN_STAFF_CODE } from "@/lib/auth/period-admin-staff"
import { STAFF_BOOTSTRAP_ADMIN_ID } from "@/lib/import/constants"
import { MasterDomainError } from "./errors"
import { branchSupportsHoAdminAccess } from "./validate-staff-role-branch"

type StaffDb = Pick<PrismaClient, "staff">

export function assertReservedStaffIdForCreate(staffId: string): void {
  if (staffId === DEV_PERIOD_ADMIN_STAFF_CODE) {
    throw new MasterDomainError(
      `Staff ID ${DEV_PERIOD_ADMIN_STAFF_CODE} is reserved for development`,
      "RESERVED_STAFF_ID",
      400
    )
  }
}

export function assertMasterStaffMutable(staff: { staffId: string }): void {
  if (staff.staffId === DEV_PERIOD_ADMIN_STAFF_CODE) {
    throw new MasterDomainError(
      `Staff ${DEV_PERIOD_ADMIN_STAFF_CODE} cannot be changed via Master Database`,
      "RESERVED_STAFF_ID",
      400
    )
  }
}

export function assertBootstrapStaffDeleteAllowed(staff: { staffId: string }): void {
  if (staff.staffId === STAFF_BOOTSTRAP_ADMIN_ID) {
    throw new MasterDomainError(
      `Bootstrap admin ${STAFF_BOOTSTRAP_ADMIN_ID} cannot be deleted`,
      "BOOTSTRAP_STAFF_PROTECTED",
      409
    )
  }
}

export async function countActiveHoAdmins(
  db: StaffDb,
  excludeStaffRecordId?: string
): Promise<number> {
  return db.staff.count({
    where: {
      role: "HO_ADMIN",
      deleted: false,
      ...(excludeStaffRecordId ? { id: { not: excludeStaffRecordId } } : {}),
    },
  })
}

export async function assertLastHoAdminChangeAllowed(input: {
  db: StaffDb
  staffRecordId: string
  currentRole: Role
  nextRole: Role
  nextBranch: { type: string; isActive: boolean; deleted: boolean }
}): Promise<void> {
  if (input.currentRole !== "HO_ADMIN") {
    return
  }

  const otherAdmins = await countActiveHoAdmins(input.db, input.staffRecordId)
  if (otherAdmins > 0) {
    return
  }

  const remainsHoAdmin = input.nextRole === "HO_ADMIN"
  const branchOk = branchSupportsHoAdminAccess(input.nextBranch)

  if (!remainsHoAdmin || !branchOk) {
    throw new MasterDomainError(
      "Cannot remove or invalidate the last HO_ADMIN account",
      "LAST_HO_ADMIN",
      409
    )
  }
}

export function assertNotSelfDelete(
  actorStaffId: string | undefined,
  targetStaffId: string
): void {
  if (actorStaffId && actorStaffId === targetStaffId) {
    throw new MasterDomainError(
      "You cannot delete your own staff account",
      "CANNOT_DELETE_SELF",
      409
    )
  }
}
