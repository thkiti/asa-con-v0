import type { Prisma } from "@/generated/prisma/client"
import { AccountingPeriodStatus } from "@/generated/prisma/client"
import { FinancePostingError } from "./posting-errors"
import { addMoney, roundMoney, toMoney, ZERO } from "./decimal"
import type { JournalLineDraft } from "./posting-types"

export function sumDebits(lines: JournalLineDraft[]): Prisma.Decimal {
  return lines.reduce((acc, line) => addMoney(acc, toMoney(line.debit)), ZERO)
}

export function sumCredits(lines: JournalLineDraft[]): Prisma.Decimal {
  return lines.reduce((acc, line) => addMoney(acc, toMoney(line.credit)), ZERO)
}

export function assertBalanced(lines: JournalLineDraft[]): void {
  const debits = sumDebits(lines)
  const credits = sumCredits(lines)
  if (!debits.equals(credits)) {
    throw new FinancePostingError(
      `Journal lines are not balanced: debits=${debits.toString()} credits=${credits.toString()}`,
      "UNBALANCED_ENTRY"
    )
  }
}

export function assertNonZeroLines(lines: JournalLineDraft[]): void {
  if (lines.length < 2) {
    throw new FinancePostingError(
      "Journal entry requires at least two lines",
      "INSUFFICIENT_LINES"
    )
  }
  for (const line of lines) {
    const debit = toMoney(line.debit)
    const credit = toMoney(line.credit)
    if (debit.isZero() && credit.isZero()) {
      throw new FinancePostingError(
        "Journal line must have a non-zero debit or credit",
        "ZERO_LINE"
      )
    }
    if (!debit.isZero() && !credit.isZero()) {
      throw new FinancePostingError(
        "Journal line cannot have both debit and credit",
        "INVALID_LINE"
      )
    }
  }
}

/** Blocks posting when status is not OPEN (SOFT_CLOSED and HARD_CLOSED included). */
export function assertPeriodOpen(status: AccountingPeriodStatus): void {
  if (status !== AccountingPeriodStatus.OPEN) {
    throw new FinancePostingError(
      "Accounting period is not open for posting",
      "PERIOD_CLOSED"
    )
  }
}

export { roundMoney, toMoney }
