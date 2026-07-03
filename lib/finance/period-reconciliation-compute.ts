import { roundMoney, toMoney, ZERO } from "./decimal"

export type BankReconciliationComputeInput = {
  glBalance: string | number
  bankStatementBalance: string | number
  outstandingDeposits?: string | number
  outstandingPayments?: string | number
  bankCharges?: string | number
  interest?: string | number
  adjustments?: string | number
}

export type BankReconciliationComputeResult = {
  reconciledBalance: string
  variance: string
}

/**
 * Book-side adjusted balance vs bank statement.
 * reconciledBalance = GL + deposits in transit − outstanding payments + interest − charges + adjustments
 * variance = reconciledBalance − bankStatementBalance (zero when reconciled)
 */
export function computeBankReconciliationAmounts(
  input: BankReconciliationComputeInput
): BankReconciliationComputeResult {
  const glBalance = toMoney(input.glBalance)
  const bankStatementBalance = toMoney(input.bankStatementBalance)
  const outstandingDeposits = toMoney(input.outstandingDeposits ?? ZERO)
  const outstandingPayments = toMoney(input.outstandingPayments ?? ZERO)
  const bankCharges = toMoney(input.bankCharges ?? ZERO)
  const interest = toMoney(input.interest ?? ZERO)
  const adjustments = toMoney(input.adjustments ?? ZERO)

  const reconciledBalance = roundMoney(
    glBalance
      .plus(outstandingDeposits)
      .minus(outstandingPayments)
      .plus(interest)
      .minus(bankCharges)
      .plus(adjustments)
  )

  const variance = roundMoney(reconciledBalance.minus(bankStatementBalance))

  return {
    reconciledBalance: reconciledBalance.toFixed(2),
    variance: variance.toFixed(2),
  }
}

export type CashReconciliationComputeInput = {
  expectedCash: string | number
  actualCountedCash: string | number
}

export type CashReconciliationComputeResult = {
  variance: string
}

export function computeCashReconciliationVariance(
  input: CashReconciliationComputeInput
): CashReconciliationComputeResult {
  const variance = roundMoney(
    toMoney(input.actualCountedCash).minus(toMoney(input.expectedCash))
  )
  return { variance: variance.toFixed(2) }
}
