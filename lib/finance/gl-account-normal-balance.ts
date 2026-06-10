import { GlAccountType } from "@/generated/prisma/client"

export type NormalBalance = "DEBIT" | "CREDIT"

export function expectedNormalBalance(accountType: GlAccountType): NormalBalance {
  switch (accountType) {
    case GlAccountType.ASSET:
    case GlAccountType.EXPENSE:
      return "DEBIT"
    case GlAccountType.LIABILITY:
    case GlAccountType.EQUITY:
    case GlAccountType.REVENUE:
      return "CREDIT"
    default:
      return "DEBIT"
  }
}

export function parseNormalBalance(value: string): NormalBalance | null {
  const raw = value.trim().toUpperCase()
  if (raw === "DEBIT" || raw === "CREDIT") {
    return raw
  }
  return null
}

export function validateNormalBalanceForType(
  accountType: GlAccountType,
  normalBalance: NormalBalance
): boolean {
  return expectedNormalBalance(accountType) === normalBalance
}
