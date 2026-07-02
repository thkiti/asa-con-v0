import { Prisma } from "@/generated/prisma/client"
import type { PaymentMethod } from "@/generated/prisma/client"
import {
  resolveAccountsForPosSale,
  resolveTenderAccountCodeForPosPayment,
} from "@/lib/finance/account-map"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"
import {
  buildPosVatEconomics,
  posVatEconomicsFromSaleSnapshot,
  type PosVatEconomics,
} from "@/lib/finance/pos-sale-vat"
import {
  DEFAULT_VAT_OUTPUT_STANDARD_RATE_BPS,
  VAT_OUTPUT_STANDARD_TAX_CODE,
} from "@/lib/finance/tax-policy"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import {
  sumCogsFromLedgerIssues,
  type LedgerIssueRow,
} from "@/lib/pos/checkout-finance"
import { HISTORICAL_POSTING_ROUNDING_TOLERANCE } from "./constants"
import type {
  HistoricalPostingEconomicsTotals,
  HistoricalPostingGrandSummary,
  HistoricalPostingReconciliation,
  HistoricalPostingReconciliationCheck,
  HistoricalPostingShopSummary,
} from "./types"
import { vatVerificationFromGross } from "./vat-verification"

export function saleHasCompleteVatSnapshot(sale: {
  netAmount: Prisma.Decimal | null
  vatAmount: Prisma.Decimal | null
  vatRateBps: number | null
  taxCode: string | null
  outputVatAccountCode: string | null
}): boolean {
  return (
    sale.netAmount != null &&
    sale.vatAmount != null &&
    sale.vatRateBps != null &&
    Boolean(sale.taxCode) &&
    Boolean(sale.outputVatAccountCode)
  )
}

export function resolveHistoricalSaleVatEconomics(input: {
  total: Prisma.Decimal | number | string
  createdAt: Date
  netAmount?: Prisma.Decimal | null
  vatAmount?: Prisma.Decimal | null
  vatRateBps?: number | null
  taxCode?: string | null
  outputVatAccountCode?: string | null
}): PosVatEconomics | null {
  if (
    input.netAmount != null &&
    input.vatAmount != null &&
    input.vatRateBps != null &&
    input.taxCode &&
    input.outputVatAccountCode
  ) {
    return posVatEconomicsFromSaleSnapshot({
      total: input.total,
      netAmount: input.netAmount,
      vatAmount: input.vatAmount,
      vatRateBps: input.vatRateBps,
      taxCode: input.taxCode,
      outputVatAccountCode: input.outputVatAccountCode,
    })
  }

  if (toMoney(input.total).lte(ZERO)) {
    return null
  }

  return buildPosVatEconomics(input.total, {
    taxCode: VAT_OUTPUT_STANDARD_TAX_CODE,
    rateBps: DEFAULT_VAT_OUTPUT_STANDARD_RATE_BPS,
    inclusive: true,
    outputVatAccountCode: DEFAULT_ACCOUNT_CODES.OUTPUT_VAT,
  })
}

export function computeHistoricalSaleEconomics(input: {
  total: Prisma.Decimal | number | string
  paymentMethod: PaymentMethod
  ledgerRows: LedgerIssueRow[]
  vatEconomics: PosVatEconomics
}): HistoricalPostingEconomicsTotals {
  const cogsAmount = sumCogsFromLedgerIssues(input.ledgerRows)
  const verification = vatVerificationFromGross(input.total)
  const lines = resolveAccountsForPosSale({
    paymentMethod: input.paymentMethod,
    total: input.total,
    cogsAmount,
    vatEconomics: input.vatEconomics,
  })

  let grossTotal = ZERO
  let netRevenueTotal = ZERO
  let outputVatTotal = ZERO
  let cogsTotal = ZERO
  let inventoryCreditTotal = ZERO
  let tenderTotal = ZERO
  const tenderByMethod: Record<string, Prisma.Decimal> = {}
  const tenderByAccountCode: Record<string, Prisma.Decimal> = {}

  for (const line of lines) {
    const debit = toMoney(line.debit)
    const credit = toMoney(line.credit)
    if (line.memo === "POS tender") {
      tenderTotal = addMoney(tenderTotal, debit)
      grossTotal = addMoney(grossTotal, debit)
      const methodKey = input.paymentMethod
      tenderByMethod[methodKey] = addMoney(tenderByMethod[methodKey] ?? ZERO, debit)
      tenderByAccountCode[line.accountCode] = addMoney(
        tenderByAccountCode[line.accountCode] ?? ZERO,
        debit
      )
    } else if (line.memo === "POS net revenue") {
      netRevenueTotal = addMoney(netRevenueTotal, credit)
    } else if (line.memo === "POS output VAT") {
      outputVatTotal = addMoney(outputVatTotal, credit)
    } else if (line.memo === "COGS") {
      cogsTotal = addMoney(cogsTotal, debit)
    } else if (line.memo === "Inventory relief") {
      inventoryCreditTotal = addMoney(inventoryCreditTotal, credit)
    }
  }

  return {
    grossTotal,
    calculatedNetTotal: verification.calculatedNet,
    calculatedVatTotal: verification.calculatedVat,
    netRevenueTotal,
    outputVatTotal,
    cogsTotal,
    inventoryCreditTotal,
    tenderTotal,
    tenderByMethod,
    tenderByAccountCode,
  }
}

export function emptyEconomicsTotals(): HistoricalPostingEconomicsTotals {
  return {
    grossTotal: ZERO,
    calculatedNetTotal: ZERO,
    calculatedVatTotal: ZERO,
    netRevenueTotal: ZERO,
    outputVatTotal: ZERO,
    cogsTotal: ZERO,
    inventoryCreditTotal: ZERO,
    tenderTotal: ZERO,
    tenderByMethod: {},
    tenderByAccountCode: {},
  }
}

export function addEconomicsTotals(
  left: HistoricalPostingEconomicsTotals,
  right: HistoricalPostingEconomicsTotals
): HistoricalPostingEconomicsTotals {
  const tenderByMethod = { ...left.tenderByMethod }
  for (const [method, amount] of Object.entries(right.tenderByMethod)) {
    tenderByMethod[method] = addMoney(tenderByMethod[method] ?? ZERO, amount)
  }

  const tenderByAccountCode = { ...left.tenderByAccountCode }
  for (const [code, amount] of Object.entries(right.tenderByAccountCode)) {
    tenderByAccountCode[code] = addMoney(tenderByAccountCode[code] ?? ZERO, amount)
  }

  return {
    grossTotal: addMoney(left.grossTotal, right.grossTotal),
    calculatedNetTotal: addMoney(left.calculatedNetTotal, right.calculatedNetTotal),
    calculatedVatTotal: addMoney(left.calculatedVatTotal, right.calculatedVatTotal),
    netRevenueTotal: addMoney(left.netRevenueTotal, right.netRevenueTotal),
    outputVatTotal: addMoney(left.outputVatTotal, right.outputVatTotal),
    cogsTotal: addMoney(left.cogsTotal, right.cogsTotal),
    inventoryCreditTotal: addMoney(
      left.inventoryCreditTotal,
      right.inventoryCreditTotal
    ),
    tenderTotal: addMoney(left.tenderTotal, right.tenderTotal),
    tenderByMethod,
    tenderByAccountCode,
  }
}

export function tenderAccountLabel(method: PaymentMethod): string {
  return resolveTenderAccountCodeForPosPayment(method)
}

function withinTolerance(a: Prisma.Decimal, b: Prisma.Decimal): boolean {
  return toMoney(a.minus(b).abs()).lte(HISTORICAL_POSTING_ROUNDING_TOLERANCE)
}

function differenceAmount(a: Prisma.Decimal, b: Prisma.Decimal): Prisma.Decimal {
  return toMoney(a.minus(b).abs())
}

function buildReconciliationCheck(input: {
  name: string
  leftLabel: string
  leftValue: Prisma.Decimal
  rightLabel: string
  rightValue: Prisma.Decimal
}): HistoricalPostingReconciliationCheck {
  const diff = differenceAmount(input.leftValue, input.rightValue)
  return {
    name: input.name,
    pass: diff.lte(HISTORICAL_POSTING_ROUNDING_TOLERANCE),
    leftLabel: input.leftLabel,
    leftValue: decimalToMoneyString(input.leftValue),
    rightLabel: input.rightLabel,
    rightValue: decimalToMoneyString(input.rightValue),
    difference: decimalToMoneyString(diff),
  }
}

export function reconcileHistoricalPostingSummaries(input: {
  shopSummaries: HistoricalPostingShopSummary[]
  grandSummary: HistoricalPostingGrandSummary
}): HistoricalPostingReconciliation {
  const shopGross = input.shopSummaries.reduce(
    (sum, row) => addMoney(sum, row.grossTotal),
    ZERO
  )
  const shopVouchers = input.shopSummaries.reduce(
    (sum, row) => sum + row.voucherCount,
    0
  )

  const netPlusVat = addMoney(
    input.grandSummary.calculatedNetTotal,
    input.grandSummary.calculatedVatTotal
  )

  const checks: HistoricalPostingReconciliationCheck[] = [
    buildReconciliationCheck({
      name: "Gross = Net + VAT",
      leftLabel: "Gross",
      leftValue: input.grandSummary.grossTotal,
      rightLabel: "Calculated Net + Calculated VAT",
      rightValue: netPlusVat,
    }),
    buildReconciliationCheck({
      name: "Tender = Gross",
      leftLabel: "Tender Total",
      leftValue: input.grandSummary.tenderTotal,
      rightLabel: "Gross",
      rightValue: input.grandSummary.grossTotal,
    }),
    buildReconciliationCheck({
      name: "COGS = Inventory Credit",
      leftLabel: "COGS",
      leftValue: input.grandSummary.cogsTotal,
      rightLabel: "Inventory Credit",
      rightValue: input.grandSummary.inventoryCreditTotal,
    }),
  ]

  return {
    grossEqualsNetPlusVat: checks[0]?.pass ?? false,
    tenderEqualsGross: checks[1]?.pass ?? false,
    cogsEqualsInventoryCredit: checks[2]?.pass ?? false,
    shopGrossSumEqualsGrandGross: withinTolerance(
      shopGross,
      input.grandSummary.grossTotal
    ),
    shopVoucherCountEqualsGrandVoucherCount:
      shopVouchers === input.grandSummary.voucherCount,
    checks,
  }
}

export function decimalToMoneyString(value: Prisma.Decimal): string {
  return toMoney(value).toFixed(2)
}

export function serializeEconomicsTotals(
  totals: HistoricalPostingEconomicsTotals
): Record<string, unknown> {
  return {
    grossTotal: decimalToMoneyString(totals.grossTotal),
    calculatedNetTotal: decimalToMoneyString(totals.calculatedNetTotal),
    calculatedVatTotal: decimalToMoneyString(totals.calculatedVatTotal),
    netRevenueTotal: decimalToMoneyString(totals.netRevenueTotal),
    outputVatTotal: decimalToMoneyString(totals.outputVatTotal),
    cogsTotal: decimalToMoneyString(totals.cogsTotal),
    inventoryCreditTotal: decimalToMoneyString(totals.inventoryCreditTotal),
    tenderTotal: decimalToMoneyString(totals.tenderTotal),
    tenderByMethod: Object.fromEntries(
      Object.entries(totals.tenderByMethod).map(([method, amount]) => [
        method,
        decimalToMoneyString(amount),
      ])
    ),
    tenderByAccountCode: Object.fromEntries(
      Object.entries(totals.tenderByAccountCode).map(([code, amount]) => [
        code,
        decimalToMoneyString(amount),
      ])
    ),
  }
}
