import type { PrismaClient } from "@/generated/prisma/client"
import { toBranchListItem } from "./branch-mapper"
import { MasterDomainError } from "./errors"
import type { UpdateBranchInput } from "./parse-branch-mutation"
import type { BranchListItem } from "./types"

type BranchDb = Pick<PrismaClient, "branch">

export async function updateBranch(
  db: BranchDb,
  id: string,
  input: UpdateBranchInput
): Promise<BranchListItem> {
  const existing = await db.branch.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!existing) {
    throw new MasterDomainError("Branch not found", "BRANCH_NOT_FOUND", 404)
  }

  const updated = await db.branch.update({
    where: { id },
    data: {
      name: input.name.trim(),
      isActive: input.isActive,
      address: input.address,
      phone: input.phone,
      taxId: input.taxId,
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
  })

  return toBranchListItem(updated)
}
