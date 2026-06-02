import type { PrismaClient } from "@/generated/prisma/client"
import { STAFF_BOOTSTRAP_ADMIN_ID } from "@/lib/import/constants"

import { DEV_PERIOD_ADMIN_STAFF_CODE } from "./period-admin-staff"

export type StaffBootstrapStatus = {
  importedStaffCount: number
  hasBootstrapAdmin: boolean
}

/** Counts real imported staff (excludes dev-only DEV seed). */
export async function getStaffBootstrapStatus(
  db: PrismaClient
): Promise<StaffBootstrapStatus> {
  const [importedStaffCount, bootstrapAdmin] = await Promise.all([
    db.staff.count({
      where: {
        deleted: false,
        staffId: { not: DEV_PERIOD_ADMIN_STAFF_CODE },
      },
    }),
    db.staff.findUnique({
      where: { staffId: STAFF_BOOTSTRAP_ADMIN_ID },
      select: { deleted: true },
    }),
  ])

  return {
    importedStaffCount,
    hasBootstrapAdmin: Boolean(bootstrapAdmin && !bootstrapAdmin.deleted),
  }
}
