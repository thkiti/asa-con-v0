import type { PrismaClient } from "@/generated/prisma/client"
import { COMPANY_TAX_BRANCH_CODE } from "./constants"

type BranchDb = Pick<PrismaClient, "branch">

export async function loadCompanyTaxId(db: BranchDb): Promise<string | null> {
  const row = await db.branch.findUnique({
    where: { code: COMPANY_TAX_BRANCH_CODE },
    select: { taxId: true },
  })
  const taxId = row?.taxId?.trim()
  return taxId || null
}
