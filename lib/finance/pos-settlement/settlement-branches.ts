import type { PrismaClient } from "@/generated/prisma/client"
import { BranchType } from "@/generated/prisma/client"
import { BOOTSTRAP_SHOP_BRANCH_CODE } from "@/lib/import/constants"

export type PosSettlementBranchOption = {
  id: string
  code: string
  name: string
}

type SettlementBranchDb = Pick<PrismaClient, "branch">

/** Active retail SH branches for POS settlement filters (excludes transfer buffer SH999). */
export async function listPosSettlementShopBranches(
  db: SettlementBranchDb
): Promise<PosSettlementBranchOption[]> {
  const rows = await db.branch.findMany({
    where: {
      type: BranchType.SH,
      isActive: true,
      deleted: false,
      code: { not: BOOTSTRAP_SHOP_BRANCH_CODE },
    },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  })
  return rows
}
