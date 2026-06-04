import type { PrismaClient } from "@/generated/prisma/client"
import type { BranchListItem, BranchListQuery } from "./types"

type BranchDb = Pick<PrismaClient, "branch">

export async function listBranches(
  db: BranchDb,
  query: BranchListQuery
): Promise<BranchListItem[]> {
  const q = query.q.trim()

  const rows = await db.branch.findMany({
    where: {
      deleted: query.mode === "trash",
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      address: true,
      phone: true,
      taxId: true,
      isActive: true,
      deleted: true,
    },
    orderBy: { code: "asc" },
  })

  return rows
}
