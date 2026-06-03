import type { PrismaClient } from "@/generated/prisma/client"
import { MasterDomainError } from "./errors"
import type { AssignableBranch } from "./validate-staff-role-branch"

type BranchDb = Pick<PrismaClient, "branch">

export async function loadAssignableBranch(
  db: BranchDb,
  branchId: string
): Promise<AssignableBranch> {
  const branch = await db.branch.findUnique({
    where: { id: branchId },
    select: { id: true, type: true, isActive: true, deleted: true },
  })

  if (!branch) {
    throw new MasterDomainError("Branch not found", "BRANCH_NOT_FOUND", 404)
  }

  return branch
}
