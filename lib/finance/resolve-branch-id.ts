import type { PrismaClient } from "@/generated/prisma/client"
import { ReconciliationSnapshotError } from "./reconciliation-snapshot-errors"

export type BranchLookupPrisma = Pick<PrismaClient, "branch">

/**
 * Resolves a branch filter key (Branch.id or Branch.code) to Branch.id for FK writes.
 */
export async function resolveBranchId(
  prisma: BranchLookupPrisma,
  branchKey?: string
): Promise<string | undefined> {
  const key = branchKey?.trim()
  if (!key) {
    return undefined
  }

  const branch = await prisma.branch.findFirst({
    where: {
      deleted: false,
      isActive: true,
      OR: [{ id: key }, { code: key }],
    },
    select: { id: true },
  })

  if (!branch) {
    throw new ReconciliationSnapshotError(
      `Branch not found: ${key}`,
      "BRANCH_NOT_FOUND"
    )
  }

  return branch.id
}
