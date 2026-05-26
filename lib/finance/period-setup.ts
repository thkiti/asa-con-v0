import type { Prisma } from "@/generated/prisma/client"
import { AccountingPeriodStatus } from "@/generated/prisma/client"

/** Creates an OPEN period only when missing; never changes status on an existing row. */
export async function bootstrapPeriodIfMissing(
  tx: Prisma.TransactionClient,
  input: { branchId: string; periodKey: string }
): Promise<NonNullable<Awaited<ReturnType<typeof tx.accountingPeriod.findUnique>>>> {
  let period = await tx.accountingPeriod.findUnique({
    where: {
      branchId_periodKey: {
        branchId: input.branchId,
        periodKey: input.periodKey,
      },
    },
  })

  if (!period) {
    period = await tx.accountingPeriod.create({
      data: {
        branchId: input.branchId,
        periodKey: input.periodKey,
        status: AccountingPeriodStatus.OPEN,
      },
    })
  }

  return period
}
