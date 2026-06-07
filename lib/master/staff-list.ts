import type { PrismaClient } from "@/generated/prisma/client"
import { DEV_PERIOD_ADMIN_STAFF_CODE } from "@/lib/auth/period-admin-staff"
import { toStaffListItem } from "./staff-mapper"
import type { StaffListItem, StaffListQuery } from "./types"

type StaffDb = Pick<PrismaClient, "staff">

export async function listStaff(
  db: StaffDb,
  query: StaffListQuery
): Promise<StaffListItem[]> {
  const q = query.q.trim()

  const rows = await db.staff.findMany({
    where: {
      staffId: { not: DEV_PERIOD_ADMIN_STAFF_CODE },
      deleted: query.mode === "trash",
      ...(query.role ? { role: query.role } : {}),
      ...(query.branchCode
        ? { branch: { code: query.branchCode } }
        : {}),
      ...(q
        ? {
            OR: [
              { staffId: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      branch: {
        select: { code: true, name: true },
      },
    },
    orderBy: { staffId: "asc" },
  })

  return rows.map((row) => toStaffListItem(row))
}
