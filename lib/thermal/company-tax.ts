import type { PrismaClient } from "@/generated/prisma/client"
import { BOOTSTRAP_HO_BRANCH_CODE } from "@/lib/import/constants"

/** Branch row whose taxId is the company tax ID on all receipts. */
export const COMPANY_TAX_BRANCH_CODE = BOOTSTRAP_HO_BRANCH_CODE

type BranchDb = Pick<PrismaClient, "branch">

export async function loadCompanyTaxId(db: BranchDb): Promise<string | null> {
  const row = await db.branch.findUnique({
    where: { code: COMPANY_TAX_BRANCH_CODE },
    select: { taxId: true },
  })
  const taxId = row?.taxId?.trim()
  return taxId || null
}
