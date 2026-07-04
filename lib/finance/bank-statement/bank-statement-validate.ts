import type { BankStatementLineInput, BankStatementValidationResult } from "./bank-statement-types"

function parseAmount(value: string | number | null | undefined): number {
  if (value == null) return 0
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }
  const trimmed = value.trim()
  if (!trimmed) return 0
  const parsed = Number.parseFloat(trimmed.replace(/,/g, ""))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatAmount(value: number): string {
  return value.toFixed(2)
}

function amountsEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005
}

export function validateBankStatementBalances(input: {
  openingBalance: string
  closingBalance: string
  lines: Pick<
    BankStatementLineInput,
    "depositAmount" | "withdrawalAmount"
  >[]
}): BankStatementValidationResult {
  const opening = parseAmount(input.openingBalance)
  const declaredClosing = parseAmount(input.closingBalance)

  let totalDeposits = 0
  let totalWithdrawals = 0
  for (const line of input.lines) {
    totalDeposits += parseAmount(line.depositAmount)
    totalWithdrawals += parseAmount(line.withdrawalAmount)
  }

  const computedClosing = opening + totalDeposits - totalWithdrawals
  const isValid = amountsEqual(computedClosing, declaredClosing)

  return {
    isValid,
    openingBalance: formatAmount(opening),
    totalDeposits: formatAmount(totalDeposits),
    totalWithdrawals: formatAmount(totalWithdrawals),
    computedClosingBalance: formatAmount(computedClosing),
    declaredClosingBalance: formatAmount(declaredClosing),
    message: isValid
      ? "Statement balances reconcile: Opening + Deposits − Withdrawals = Closing."
      : "Statement balances do not reconcile. Check opening, line amounts, and closing balance.",
  }
}

export function isPersistableBankStatementLine(
  line: Pick<
    BankStatementLineInput,
    "transactionDate" | "description" | "depositAmount" | "withdrawalAmount"
  >
): boolean {
  const deposit = String(line.depositAmount ?? "").trim()
  const withdrawal = String(line.withdrawalAmount ?? "").trim()
  return Boolean(deposit || withdrawal)
}

export function normalizeChequeNumber(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.replace(/[\s-]/g, "")
}

export function normalizePeriodKey(value: string): string {
  return value.trim()
}

export function isValidPeriodKey(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value.trim())
}

export function parseStatementDate(value: string): Date {
  const trimmed = value.trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (!match) {
    throw new Error("statementDate must be YYYY-MM-DD")
  }
  return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`)
}

export function parseLineTransactionDate(value: string): Date {
  return parseStatementDate(value)
}

export function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}
