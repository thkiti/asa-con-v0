import type { PrismaClient } from "@/generated/prisma/client"
import { deleteBranch } from "./delete-branch"
import type { PatchBranchBody } from "./parse-branch-mutation"
import { restoreBranch } from "./restore-branch"
import { updateBranch } from "./update-branch"
import type { BranchListItem } from "./types"

type BranchDb = Pick<PrismaClient, "branch">

export async function patchBranch(
  db: BranchDb,
  id: string,
  body: PatchBranchBody
): Promise<BranchListItem> {
  if (body.action === "delete") {
    return deleteBranch(db, id)
  }
  if (body.action === "restore") {
    return restoreBranch(db, id)
  }
  return updateBranch(db, id, {
    name: body.name,
    isActive: body.isActive,
    address: body.address,
    phone: body.phone,
    taxId: body.taxId,
  })
}
