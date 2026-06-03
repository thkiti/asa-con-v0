import type { PrismaClient } from "@/generated/prisma/client"
import { toBranchListItem } from "./branch-mapper"
import { MasterDomainError } from "./errors"
import type { BranchListItem } from "./types"

type BranchDb = Pick<PrismaClient, "branch">

export async function restoreBranch(db: BranchDb, id: string): Promise<BranchListItem> {
  const existing = await db.branch.findUnique({
    where: { id },
    select: { id: true },
  })

  if (!existing) {
    throw new MasterDomainError("Branch not found", "BRANCH_NOT_FOUND", 404)
  }

  const updated = await db.branch.update({
    where: { id },
    data: { deleted: false },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      isActive: true,
      deleted: true,
    },
  })

  return toBranchListItem(updated)
}
