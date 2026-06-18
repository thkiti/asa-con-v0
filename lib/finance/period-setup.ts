import type { Prisma } from "@/generated/prisma/client"
import { AccountingPeriodStatus } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { HO_BRANCH_CODE } from "@/lib/legal-entity/constants"
import { FinancePostingError } from "./posting-errors"
import { accountingPeriodUniqueWhere, resolvePeriodLegalEntityCode } from "./period-lookup"

async function resolveBootstrapBranchId(
  tx: Prisma.TransactionClient,
  branchIdHint?: string | null
): Promise<string> {
  const hinted = branchIdHint?.trim()
  if (hinted) {
    return hinted
  }

  const hoBranch = await tx.branch.findUnique({
    where: { code: HO_BRANCH_CODE },
    select: { id: true },
  })

  if (!hoBranch) {
    throw new FinancePostingError(
      `Branch ${HO_BRANCH_CODE} not found — cannot bootstrap accounting period`,
      "BRANCH_NOT_FOUND"
    )
  }

  return hoBranch.id
}

/** Creates an OPEN period only when missing; never changes status on an existing row. */
export async function bootstrapPeriodIfMissing(
  tx: Prisma.TransactionClient,
  input: {
    periodKey: string
    legalEntityCode?: DocumentEntityCode | null
    /** Legacy metadata only — ignored when period already exists; defaults to HO999 on create. */
    branchId?: string | null
  }
): Promise<NonNullable<Awaited<ReturnType<typeof tx.accountingPeriod.findUnique>>>> {
  const legalEntityCode = resolvePeriodLegalEntityCode(input.legalEntityCode)

  let period = await tx.accountingPeriod.findUnique({
    where: accountingPeriodUniqueWhere({
      periodKey: input.periodKey,
      legalEntityCode,
    }),
  })

  if (!period) {
    const branchId = await resolveBootstrapBranchId(tx, input.branchId)
    period = await tx.accountingPeriod.create({
      data: {
        branchId,
        legalEntityCode,
        periodKey: input.periodKey,
        status: AccountingPeriodStatus.OPEN,
      },
    })
  }

  return period
}
