import type { Prisma } from "@/generated/prisma/client"
import { AccountingPeriodStatus } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { accountingPeriodUniqueWhere, resolvePeriodLegalEntityCode } from "./period-lookup"

/** Creates an OPEN period only when missing; never changes status on an existing row. */
export async function bootstrapPeriodIfMissing(
  tx: Prisma.TransactionClient,
  input: {
    branchId: string
    periodKey: string
    legalEntityCode?: DocumentEntityCode | null
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
    period = await tx.accountingPeriod.create({
      data: {
        branchId: input.branchId,
        legalEntityCode,
        periodKey: input.periodKey,
        status: AccountingPeriodStatus.OPEN,
      },
    })
  }

  return period
}
