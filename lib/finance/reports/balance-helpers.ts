import { GlAccountType, Prisma } from "@/generated/prisma/client"
import { roundMoney } from "../decimal"

/** Signed balance by account type (debit-normal vs credit-normal). */
export function signedBalanceForAccountType(
  accountType: GlAccountType,
  debitTotal: Prisma.Decimal,
  creditTotal: Prisma.Decimal
): Prisma.Decimal {
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

export function isTrialBalanceBalanced(
  totalDebits: Prisma.Decimal,
  totalCredits: Prisma.Decimal
): boolean {
  return roundMoney(totalDebits).equals(roundMoney(totalCredits))
}

export function trialBalanceDifference(
  totalDebits: Prisma.Decimal,
  totalCredits: Prisma.Decimal
): Prisma.Decimal {
  return roundMoney(totalDebits.minus(totalCredits))
}

export function isBalanceSheetBalanced(
  totalAssets: Prisma.Decimal,
  totalLiabilities: Prisma.Decimal,
  totalEquity: Prisma.Decimal
): boolean {
  return roundMoney(totalAssets).equals(
    roundMoney(totalLiabilities.plus(totalEquity))
  )
}

export function balanceSheetDifference(
  totalAssets: Prisma.Decimal,
  totalLiabilitiesAndEquity: Prisma.Decimal
): Prisma.Decimal {
  return roundMoney(totalAssets.minus(totalLiabilitiesAndEquity))
}
