import { PaymentMethod } from "@/generated/prisma/client"
import type { PrismaClient } from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "./account-map"
import { roundMoney, toMoney } from "./decimal"
import { getGlAccountBalance } from "./gl-balance"
import { ReconciliationError } from "./reconciliation-errors"
import type {
  InventoryReconciliationFilter,
  InventoryReconciliationResult,
  ReconciliationVariance,
  SalesReconciliationFilter,
  SalesReconciliationResult,
} from "./reconciliation-types"
import { getSalesSummary } from "@/lib/pos/sales-summary"
import { getStockSummary } from "@/lib/stock/stock-summary"

export type ReconciliationPrisma = Pick<
  PrismaClient,
  "stock" | "sale" | "glAccount" | "journalEntryLine"
>

export function computeVariance(
  operational: string | number,
  gl: string | number
): string {
  return roundMoney(toMoney(operational).minus(toMoney(gl))).toString()
}

function buildVariance(input: {
  domain: string
  label: string
  operationalAmount: string
  glAmount: string
  varianceType?: string
  varianceReason?: string
}): ReconciliationVariance {
  return {
    domain: input.domain,
    label: input.label,
    operationalAmount: input.operationalAmount,
    glAmount: input.glAmount,
    variance: computeVariance(input.operationalAmount, input.glAmount),
    varianceType: input.varianceType,
    varianceReason: input.varianceReason,
  }
}

function glBalanceForCode(
  accounts: Awaited<ReturnType<typeof getGlAccountBalance>>["accounts"],
  code: string
): string {
  const row = accounts.find((a) => a.accountCode === code)
  if (!row) {
    throw new ReconciliationError(
      `GL balance missing for account code ${code}`,
      "ACCOUNT_NOT_FOUND"
    )
  }
  return row.balance
}

export async function reconcileInventory(
  prisma: ReconciliationPrisma,
  filter: InventoryReconciliationFilter = {}
): Promise<InventoryReconciliationResult> {
  const stockSummary = await getStockSummary(prisma, {
    branchId: filter.branchId,
  })

  const glBalance = await getGlAccountBalance(prisma, {
    accountCodes: [DEFAULT_ACCOUNT_CODES.INVENTORY],
    branchId: filter.branchId,
    from: filter.from,
    to: filter.to,
  })

  const operationalTotalValue = stockSummary.totals.totalValue
  const glInventoryBalance = glBalanceForCode(
    glBalance.accounts,
    DEFAULT_ACCOUNT_CODES.INVENTORY
  )

  const variance = buildVariance({
    domain: "inventory",
    label: "Stock valuation vs inventory GL",
    operationalAmount: operationalTotalValue,
    glAmount: glInventoryBalance,
  })

  return {
    filter,
    operationalTotalValue,
    glInventoryBalance,
    variances: [variance],
  }
}

export async function reconcileSalesAndTender(
  prisma: ReconciliationPrisma,
  filter: SalesReconciliationFilter = {}
): Promise<SalesReconciliationResult> {
  const salesSummary = await getSalesSummary(prisma, {
    branchId: filter.branchId,
    from: filter.from,
    to: filter.to,
  })

  const glBalance = await getGlAccountBalance(prisma, {
    accountCodes: [
      DEFAULT_ACCOUNT_CODES.REVENUE,
      DEFAULT_ACCOUNT_CODES.CASH,
      DEFAULT_ACCOUNT_CODES.CARD_CLEARING,
    ],
    branchId: filter.branchId,
    from: filter.from,
    to: filter.to,
  })

  const glRevenueBalance = glBalanceForCode(
    glBalance.accounts,
    DEFAULT_ACCOUNT_CODES.REVENUE
  )
  const glCashBalance = glBalanceForCode(
    glBalance.accounts,
    DEFAULT_ACCOUNT_CODES.CASH
  )
  const glCardBalance = glBalanceForCode(
    glBalance.accounts,
    DEFAULT_ACCOUNT_CODES.CARD_CLEARING
  )

  const revenueVariance = buildVariance({
    domain: "revenue",
    label: "POS revenue vs revenue GL",
    operationalAmount: salesSummary.revenue,
    glAmount: glRevenueBalance,
  })

  const operationalCash =
    salesSummary.paymentBreakdown.find((p) => p.method === PaymentMethod.CASH)
      ?.amount ?? "0"
  const operationalCard =
    salesSummary.paymentBreakdown.find((p) => p.method === PaymentMethod.CARD)
      ?.amount ?? "0"

  const paymentBreakdown: ReconciliationVariance[] = [
    buildVariance({
      domain: "tender",
      label: "Cash tender vs cash GL",
      operationalAmount: operationalCash,
      glAmount: glCashBalance,
    }),
    buildVariance({
      domain: "tender",
      label: "Card tender vs card clearing GL",
      operationalAmount: operationalCard,
      glAmount: glCardBalance,
    }),
  ]

  return {
    filter,
    operationalRevenue: salesSummary.revenue,
    glRevenueBalance,
    paymentBreakdown,
    variances: [revenueVariance, ...paymentBreakdown],
  }
}
