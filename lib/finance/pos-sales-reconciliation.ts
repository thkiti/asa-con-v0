import { PaymentMethod } from "@/generated/prisma/client"
import {
  DEFAULT_ACCOUNT_CODES,
  resolveTenderAccountCodeForPosPayment,
} from "./account-map"
import { addMoney, roundMoney, toMoney, ZERO } from "./decimal"
import type { PaymentBreakdownEntry } from "@/lib/reporting/report-types"
import type { GlAccountBalanceRow } from "./reconciliation-types"

export const POS_STAGE1_TENDER_ACCOUNT_CODES = [
  DEFAULT_ACCOUNT_CODES.CASH,
  DEFAULT_ACCOUNT_CODES.CARD_CLEARING,
  DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING,
  DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING,
] as const

export const POS_SALES_ECONOMICS_GL_ACCOUNT_CODES = [
  DEFAULT_ACCOUNT_CODES.REVENUE,
  DEFAULT_ACCOUNT_CODES.OUTPUT_VAT,
] as const

export type PosSalesReconciliationMetrics = {
  operationalGrossSales: string
  operationalGrossRefunds: string
  operationalNetGross: string
  glNetRevenue: string
  glOutputVat: string
  glGrossEquivalent: string
  salesVariance: string
  operationalTenderIn: string
  operationalTenderRefundOut: string
  operationalTenderNet: string
  glTenderClearingNet: string
  tenderVariance: string
}

export type PosTenderReconciliationRow = {
  accountCode: string
  label: string
  operationalAmount: string
  glAmount: string
  variance: string
}

function sumPaymentBreakdown(breakdown: PaymentBreakdownEntry[]): string {
  return breakdown
    .reduce((sum, row) => addMoney(sum, toMoney(row.amount)), ZERO)
    .toString()
}

function paymentAmountForMethod(
  breakdown: PaymentBreakdownEntry[],
  method: PaymentMethod
): string {
  return breakdown.find((row) => row.method === method)?.amount ?? "0"
}

function bankTransferOperationalAmount(
  breakdown: PaymentBreakdownEntry[]
): string {
  return [
    PaymentMethod.QR,
    PaymentMethod.TRANSFER,
    PaymentMethod.BANK_TRANSFER,
  ]
    .reduce(
      (sum, method) => addMoney(sum, toMoney(paymentAmountForMethod(breakdown, method))),
      ZERO
    )
    .toString()
}

export function tenderOperationalAmountForClearingAccount(
  breakdown: PaymentBreakdownEntry[],
  accountCode: string
): string {
  switch (accountCode) {
    case DEFAULT_ACCOUNT_CODES.CASH:
      return paymentAmountForMethod(breakdown, PaymentMethod.CASH)
    case DEFAULT_ACCOUNT_CODES.CARD_CLEARING:
      return paymentAmountForMethod(breakdown, PaymentMethod.CARD)
    case DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING:
      return bankTransferOperationalAmount(breakdown)
    case DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING:
      return paymentAmountForMethod(breakdown, PaymentMethod.OTHER)
    default:
      return "0"
  }
}

export const POS_STAGE1_TENDER_RECONCILIATION_LABELS: Record<
  (typeof POS_STAGE1_TENDER_ACCOUNT_CODES)[number],
  { sales: string; refund: string }
> = {
  [DEFAULT_ACCOUNT_CODES.CASH]: {
    sales: "Cash tender vs cash in drawer GL (1001)",
    refund: "Cash refund vs cash in drawer GL credit (1001)",
  },
  [DEFAULT_ACCOUNT_CODES.CARD_CLEARING]: {
    sales: "Card tender vs card clearing GL (1110)",
    refund: "Card refund vs card clearing GL credit (1110)",
  },
  [DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING]: {
    sales: "Bank transfer tender vs bank transfer clearing GL (1120)",
    refund: "Bank transfer refund vs bank transfer clearing GL credit (1120)",
  },
  [DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING]: {
    sales: "Other tender vs POS other clearing GL (1190)",
    refund: "Other refund vs POS other clearing GL credit (1190)",
  },
}

function netTenderOperationalAmountForClearingAccount(
  salesBreakdown: PaymentBreakdownEntry[],
  refundBreakdown: PaymentBreakdownEntry[],
  accountCode: string
): string {
  return moneyString(
    toMoney(tenderOperationalAmountForClearingAccount(salesBreakdown, accountCode)).minus(
      toMoney(tenderOperationalAmountForClearingAccount(refundBreakdown, accountCode))
    )
  )
}

export function buildPosRefundTenderReconciliationRows(input: {
  refundBreakdown: PaymentBreakdownEntry[]
  glTenderCreditByAccountCode: Record<string, string>
}): PosTenderReconciliationRow[] {
  return POS_STAGE1_TENDER_ACCOUNT_CODES.map((accountCode) => {
    const operationalAmount = moneyString(
      tenderOperationalAmountForClearingAccount(input.refundBreakdown, accountCode)
    )
    const glAmount = moneyString(input.glTenderCreditByAccountCode[accountCode] ?? ZERO)
    return {
      accountCode,
      label: POS_STAGE1_TENDER_RECONCILIATION_LABELS[accountCode].refund,
      operationalAmount,
      glAmount,
      variance: moneyString(
        toMoney(operationalAmount).minus(toMoney(glAmount))
      ),
    }
  })
}

function moneyString(value: Parameters<typeof toMoney>[0]): string {
  return roundMoney(toMoney(value)).toFixed(2)
}

export function computePosSalesReconciliationMetrics(input: {
  operationalGrossSales: string
  operationalGrossRefunds: string
  glNetRevenue: string
  glOutputVat: string
  operationalTenderIn: string
  operationalTenderRefundOut: string
  glTenderClearingNet: string
}): PosSalesReconciliationMetrics {
  const operationalNetGross = moneyString(
    toMoney(input.operationalGrossSales).minus(toMoney(input.operationalGrossRefunds))
  )
  const glGrossEquivalent = moneyString(
    addMoney(toMoney(input.glNetRevenue), toMoney(input.glOutputVat))
  )
  const operationalTenderNet = moneyString(
    toMoney(input.operationalTenderIn).minus(toMoney(input.operationalTenderRefundOut))
  )
  const salesVariance = moneyString(
    toMoney(operationalNetGross).minus(toMoney(glGrossEquivalent))
  )
  const tenderVariance = moneyString(
    toMoney(operationalTenderNet).minus(toMoney(input.glTenderClearingNet))
  )

  return {
    operationalGrossSales: moneyString(input.operationalGrossSales),
    operationalGrossRefunds: moneyString(input.operationalGrossRefunds),
    operationalNetGross,
    glNetRevenue: moneyString(input.glNetRevenue),
    glOutputVat: moneyString(input.glOutputVat),
    glGrossEquivalent,
    salesVariance,
    operationalTenderIn: moneyString(input.operationalTenderIn),
    operationalTenderRefundOut: moneyString(input.operationalTenderRefundOut),
    operationalTenderNet,
    glTenderClearingNet: moneyString(input.glTenderClearingNet),
    tenderVariance,
  }
}

export function buildPosTenderReconciliationRows(input: {
  salesBreakdown: PaymentBreakdownEntry[]
  refundBreakdown: PaymentBreakdownEntry[]
  glAccounts: GlAccountBalanceRow[]
}): PosTenderReconciliationRow[] {
  const glByCode = new Map(input.glAccounts.map((row) => [row.accountCode, row.balance]))

  const rows: Array<{
    accountCode: string
    label: string
    operationalAmount: string
  }> = POS_STAGE1_TENDER_ACCOUNT_CODES.map((accountCode) => ({
    accountCode,
    label: POS_STAGE1_TENDER_RECONCILIATION_LABELS[accountCode].sales,
    operationalAmount: netTenderOperationalAmountForClearingAccount(
      input.salesBreakdown,
      input.refundBreakdown,
      accountCode
    ),
  }))

  return rows.map((row) => {
    const glAmount = glByCode.get(row.accountCode) ?? "0"
    return {
      ...row,
      glAmount,
      variance: moneyString(
        toMoney(row.operationalAmount).minus(toMoney(glAmount))
      ),
    }
  })
}

export function sumTenderClearingGlNet(glAccounts: GlAccountBalanceRow[]): string {
  return moneyString(
    POS_STAGE1_TENDER_ACCOUNT_CODES.reduce(
      (sum, code) => {
        const row = glAccounts.find((account) => account.accountCode === code)
        return addMoney(sum, toMoney(row?.balance ?? ZERO))
      },
      ZERO
    )
  )
}

export function tenderAccountCodeForPaymentMethod(method: PaymentMethod): string {
  return resolveTenderAccountCodeForPosPayment(method)
}

export function sumPaymentBreakdownTotal(breakdown: PaymentBreakdownEntry[]): string {
  return sumPaymentBreakdown(breakdown)
}
