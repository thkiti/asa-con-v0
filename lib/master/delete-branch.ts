import type { PrismaClient } from "@/generated/prisma/client"
import {
  BOOTSTRAP_HO_BRANCH_CODE,
  BOOTSTRAP_SHOP_BRANCH_CODE,
} from "@/lib/import/constants"
import { toBranchListItem } from "./branch-mapper"
import { MasterDomainError } from "./errors"
import type { BranchListItem } from "./types"

type BranchDb = Pick<PrismaClient, "branch">

const PROTECTED_CODES = new Set([
  BOOTSTRAP_HO_BRANCH_CODE,
  BOOTSTRAP_SHOP_BRANCH_CODE,
])

export async function deleteBranch(db: BranchDb, id: string): Promise<BranchListItem> {
  const existing = await db.branch.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      isActive: true,
      deleted: true,
    },
  })

  if (!existing) {
    throw new MasterDomainError("Branch not found", "BRANCH_NOT_FOUND", 404)
  }

  if (PROTECTED_CODES.has(existing.code)) {
    throw new MasterDomainError(
      `Bootstrap branch ${existing.code} cannot be deleted`,
      "BOOTSTRAP_BRANCH_PROTECTED",
      409
    )
  }

  const updated = await db.branch.update({
    where: { id },
    data: { deleted: true },
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
