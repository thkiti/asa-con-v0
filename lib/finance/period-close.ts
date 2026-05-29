import type { Prisma } from "@/generated/prisma/client"
import { AccountingPeriodStatus } from "@/generated/prisma/client"
import { assertCloseReadiness } from "./close-gate"
import { getHardCloseGatePolicy } from "./close-gate-policy"
import { buildCloseReadinessChecklistForPeriod } from "./close-readiness"
import { FinancePostingError } from "./posting-errors"

type PeriodCloseInput = {
  branchId: string
  periodKey: string
  mode: "SOFT" | "HARD"
}

type PeriodReopenInput = {
  branchId: string
  periodKey: string
}

async function findAccountingPeriod(
  tx: Prisma.TransactionClient,
  input: { branchId: string; periodKey: string }
): Promise<NonNullable<Awaited<ReturnType<typeof tx.accountingPeriod.findUnique>>>> {
  const period = await tx.accountingPeriod.findUnique({
    where: {
      branchId_periodKey: {
        branchId: input.branchId,
        periodKey: input.periodKey,
      },
    },
  })

  if (!period) {
    throw new FinancePostingError(
      `Accounting period ${input.periodKey} not found`,
      "PERIOD_NOT_FOUND"
    )
  }

  return period
}

export async function closeAccountingPeriod(
  tx: Prisma.TransactionClient,
  input: PeriodCloseInput
): Promise<NonNullable<Awaited<ReturnType<typeof tx.accountingPeriod.findUnique>>>> {
  const period = await findAccountingPeriod(tx, input)

  if (input.mode === "SOFT") {
    if (period.status === AccountingPeriodStatus.HARD_CLOSED) {
      throw new FinancePostingError(
        `Accounting period ${input.periodKey} is already hard closed`,
        "PERIOD_ALREADY_HARD_CLOSED"
      )
    }

    if (period.status === AccountingPeriodStatus.SOFT_CLOSED) {
      return period
    }

    return tx.accountingPeriod.update({
      where: { id: period.id },
      data: {
        status: AccountingPeriodStatus.SOFT_CLOSED,
        closedAt: new Date(),
      },
    })
  }

  if (period.status === AccountingPeriodStatus.HARD_CLOSED) {
    return period
  }

  const checklist = await buildCloseReadinessChecklistForPeriod(tx, period)
  assertCloseReadiness(checklist, getHardCloseGatePolicy())

  return tx.accountingPeriod.update({
    where: { id: period.id },
    data: {
      status: AccountingPeriodStatus.HARD_CLOSED,
      closedAt: new Date(),
    },
  })
}

export async function reopenAccountingPeriod(
  tx: Prisma.TransactionClient,
  input: PeriodReopenInput
): Promise<NonNullable<Awaited<ReturnType<typeof tx.accountingPeriod.findUnique>>>> {
  const period = await findAccountingPeriod(tx, input)

  if (period.status === AccountingPeriodStatus.OPEN) {
    return period
  }

  if (period.status === AccountingPeriodStatus.HARD_CLOSED) {
    throw new FinancePostingError(
      `Accounting period ${input.periodKey} is hard closed and cannot be reopened`,
      "PERIOD_ALREADY_HARD_CLOSED"
    )
  }

  return tx.accountingPeriod.update({
    where: { id: period.id },
    data: {
      status: AccountingPeriodStatus.OPEN,
      closedAt: null,
    },
  })
}
