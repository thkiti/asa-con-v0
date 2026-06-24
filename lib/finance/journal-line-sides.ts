import type { Prisma } from "@/generated/prisma/client"
import { toMoney } from "@/lib/finance/decimal"

export type JournalLineSidesIssue =
  | "NEGATIVE_AMOUNT"
  | "BOTH_ZERO"
  | "BOTH_NONZERO"

export function diagnoseJournalLineSides(
  debit: Prisma.Decimal | number | string,
  credit: Prisma.Decimal | number | string
): JournalLineSidesIssue | null {
  const debitAmount = toMoney(debit)
  const creditAmount = toMoney(credit)

  if (debitAmount.isNegative() || creditAmount.isNegative()) {
    return "NEGATIVE_AMOUNT"
  }

  const debitZero = debitAmount.isZero()
  const creditZero = creditAmount.isZero()

  if (debitZero && creditZero) {
    return "BOTH_ZERO"
  }

  if (!debitZero && !creditZero) {
    return "BOTH_NONZERO"
  }

  return null
}

export function formatJournalLineSidesMessage(
  issue: JournalLineSidesIssue,
  lineIndex?: number
): string {
  const prefix = lineIndex === undefined ? "" : `Line ${lineIndex + 1}: `

  switch (issue) {
    case "NEGATIVE_AMOUNT":
      return `${prefix}debit and credit must not be negative`
    case "BOTH_ZERO":
      return `${prefix}line must have exactly one non-zero side`
    case "BOTH_NONZERO":
      return `${prefix}line cannot have both debit and credit`
  }
}
