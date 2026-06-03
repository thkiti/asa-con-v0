import type { PrismaClient } from "@/generated/prisma/client"
import type { StaffListItem, StaffListQuery } from "./types"

type StaffDb = Pick<PrismaClient, "staff">

export async function listStaff(
  db: StaffDb,
  query: StaffListQuery
): Promise<StaffListItem[]> {
  const q = query.q.trim()

  const rows = await db.staff.findMany({
    where: {
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

  return rows.map((row) => ({
    id: row.id,
    staffId: row.staffId,
    name: row.name,
    role: row.role,
    deleted: row.deleted,
    branchId: row.branchId,
    branchCode: row.branch.code,
    branchName: row.branch.name,
  }))
}
