import type { PrismaClient } from "@/generated/prisma/client"
import { BranchType } from "@/lib/shared"
import type { BranchListItem, BranchListQuery } from "./types"

type BranchDb = Pick<PrismaClient, "branch">

export async function listBranches(
  db: BranchDb,
  query: BranchListQuery
): Promise<BranchListItem[]> {
  const code = query.code.trim()
  const name = query.name.trim()
  const type =
    query.type === BranchType.HO || query.type === BranchType.SH ? query.type : null

  const rows = await db.branch.findMany({
    where: {
      deleted: query.mode === "trash",
      ...(query.mode === "active" && query.activeOnly ? { isActive: true } : {}),
      ...(code ? { code: { contains: code, mode: "insensitive" } } : {}),
      ...(name ? { name: { contains: name, mode: "insensitive" } } : {}),
      ...(type ? { type } : {}),
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
