import type { Prisma } from "@/generated/prisma/client"
import { AccountingPeriodStatus } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { FinancePostingError } from "./posting-errors"
import { accountingPeriodUniqueWhere, resolvePeriodLegalEntityCode } from "./period-lookup"

export function formatPeriodKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

export async function assertPostingPeriodOpen(
  tx: Prisma.TransactionClient,
  postingDate: Date,
  legalEntityCode?: DocumentEntityCode | null
): Promise<NonNullable<Awaited<ReturnType<typeof tx.accountingPeriod.findUnique>>>> {
  const periodKey = formatPeriodKey(postingDate)

  const period = await tx.accountingPeriod.findUnique({
    where: accountingPeriodUniqueWhere({
      periodKey,
      legalEntityCode: resolvePeriodLegalEntityCode(legalEntityCode),
    }),
  })

  if (!period) {
    throw new FinancePostingError(
      `Accounting period ${periodKey} is not opened`,
      "PERIOD_NOT_OPENED"
    )
  }

  if (period.status !== AccountingPeriodStatus.OPEN) {
    throw new FinancePostingError("period closed", "PERIOD_CLOSED")
  }

  return period
}
