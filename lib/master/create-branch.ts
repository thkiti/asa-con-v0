import type { PrismaClient } from "@/generated/prisma/client"
import { Prisma } from "@/generated/prisma/client"
import { normalizeBranchCodeForCreate } from "./branch-code"
import { toBranchListItem } from "./branch-mapper"
import { MasterDomainError } from "./errors"
import type { CreateBranchInput } from "./parse-branch-mutation"
import type { BranchListItem } from "./types"

type BranchDb = Pick<PrismaClient, "branch">

export async function createBranch(
  db: BranchDb,
  input: CreateBranchInput
): Promise<BranchListItem> {
  const code = normalizeBranchCodeForCreate(input.code, input.type)

  try {
    const created = await db.branch.create({
      data: {
        code,
        name: input.name.trim(),
        type: input.type,
        isActive: input.isActive,
        address: input.address,
        phone: input.phone,
        taxId: input.taxId,
        deleted: false,
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
    return toBranchListItem(created)
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new MasterDomainError(
        `Branch code already exists: ${code}`,
        "BRANCH_CODE_EXISTS",
        409
      )
    }
    throw err
  }
}
