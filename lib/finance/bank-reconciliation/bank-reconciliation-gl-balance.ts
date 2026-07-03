import { GlAccountType, type PrismaClient } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { normalizeDateRange } from "@/lib/reporting/date-range"
import { addMoney, roundMoney, toMoney, ZERO } from "../decimal"
import { periodKeyToDateRange } from "../period-key"
import {
  BankReconciliationError,
  BankReconciliationErrorCodes,
} from "./bank-reconciliation-errors"

export type BankReconciliationGlBalancePrisma = Pick<
  PrismaClient,
  "glAccount" | "journalEntryLine"
>

function signedBalance(
  accountType: GlAccountType,
  debitTotal: ReturnType<typeof toMoney>,
  creditTotal: ReturnType<typeof toMoney>
): ReturnType<typeof roundMoney> {
  const net = debitTotal.minus(creditTotal)
  switch (accountType) {
    case GlAccountType.ASSET:
    case GlAccountType.EXPENSE:
      return roundMoney(net)
    case GlAccountType.REVENUE:
    case GlAccountType.LIABILITY:
    case GlAccountType.EQUITY:
      return roundMoney(creditTotal.minus(debitTotal))
    default:
      return roundMoney(net)
  }
}

export async function resolveBankReconciliationGlBalance(
  prisma: BankReconciliationGlBalancePrisma,
  input: {
    legalEntityCode: DocumentEntityCode
    periodKey: string
    glAccountId: string
    branchId?: string | null
  }
): Promise<string> {
  const range = periodKeyToDateRange(input.periodKey)
  if (!range) {
    throw new BankReconciliationError(
      `Invalid period key: ${input.periodKey}`,
      BankReconciliationErrorCodes.VALIDATION
    )
  }

  const account = await prisma.glAccount.findFirst({
    where: {
      id: input.glAccountId,
      deleted: false,
      isActive: true,
    },
  })

  if (!account) {
    throw new BankReconciliationError(
      "GL account not found",
      BankReconciliationErrorCodes.ACCOUNT_NOT_FOUND,
      404
    )
  }

  const { endExclusive } = normalizeDateRange(range)

  const lines = await prisma.journalEntryLine.findMany({
    where: {
      glAccountId: account.id,
      journalEntry: {
        legalEntityCode: input.legalEntityCode,
        ...(input.branchId ? { branchId: input.branchId } : {}),
        date: { lt: endExclusive },
      },
    },
    select: { debit: true, credit: true },
  })

  let debitTotal = ZERO
  let creditTotal = ZERO
  for (const line of lines) {
    debitTotal = addMoney(debitTotal, toMoney(line.debit))
    creditTotal = addMoney(creditTotal, toMoney(line.credit))
  }

  return signedBalance(account.accountType, debitTotal, creditTotal).toFixed(2)
}
