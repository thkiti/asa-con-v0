import type { Prisma } from "@/generated/prisma/client"
import { AccountingPeriodStatus } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { HO_BRANCH_CODE } from "@/lib/legal-entity/constants"
import { FinancePostingError } from "./posting-errors"
import { advancePeriodKey } from "./period-key"
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

export type AdvanceNextPeriodOutcome =
  | { outcome: "created"; nextPeriodKey: string }
  | { outcome: "already_open"; nextPeriodKey: string }
  | { outcome: "warning"; nextPeriodKey: string; message: string }

/**
 * After a successful HARD close, ensure the next calendar period exists and is OPEN.
 * Does not overwrite non-OPEN next periods — returns a warning instead.
 */
export async function advanceNextAccountingPeriodAfterHardClose(
  tx: Prisma.TransactionClient,
  input: {
    closedPeriodKey: string
    legalEntityCode?: DocumentEntityCode | null
    branchId?: string | null
  }
): Promise<AdvanceNextPeriodOutcome> {
  const legalEntityCode = resolvePeriodLegalEntityCode(input.legalEntityCode)
  const nextPeriodKey = advancePeriodKey(input.closedPeriodKey)

  const existing = await tx.accountingPeriod.findUnique({
    where: accountingPeriodUniqueWhere({ periodKey: nextPeriodKey, legalEntityCode }),
  })

  if (!existing) {
    await bootstrapPeriodIfMissing(tx, {
      periodKey: nextPeriodKey,
      legalEntityCode,
      branchId: input.branchId,
    })
    return { outcome: "created", nextPeriodKey }
  }

  if (existing.status === AccountingPeriodStatus.OPEN) {
    return { outcome: "already_open", nextPeriodKey }
  }

  return {
    outcome: "warning",
    nextPeriodKey,
    message:
      `Next accounting period ${nextPeriodKey} already exists with status ${existing.status}. ` +
      "It was not modified automatically after hard close.",
  }
}
