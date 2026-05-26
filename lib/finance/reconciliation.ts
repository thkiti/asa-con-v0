import { PaymentMethod } from "@/generated/prisma/client"
import {
  DocStatus,
  Prisma,
  SaleStatus,
  type PrismaClient,
} from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "./account-map"
import { roundMoney, toMoney } from "./decimal"
import { getGlAccountBalance } from "./gl-balance"
import { ReconciliationError } from "./reconciliation-errors"
import type {
  FinanceReconciliationInput,
  InventoryReconciliationFilter,
  InventoryReconciliationResult,
  ReconciliationIssue,
  ReconciliationSummary,
  ReconciliationVariance,
  SalesReconciliationFilter,
  SalesReconciliationResult,
} from "./reconciliation-types"
import { FINANCE_REF_TYPES } from "./posting-types"
import { getSalesSummary } from "@/lib/pos/sales-summary"
import { sumCogsFromLedgerIssues } from "@/lib/pos/checkout-finance"
import { normalizeDateRange } from "@/lib/reporting/date-range"
import {
  sumInboundValueFromLedger,
  sumOutboundValueFromLedger,
} from "@/lib/stock/posting-finance"
import { getStockSummary } from "@/lib/stock/stock-summary"
import { STOCK_REF_TYPES } from "@/lib/stock/transaction-types"

export type ReconciliationPrisma = Pick<
  PrismaClient,
  | "stock"
  | "sale"
  | "glAccount"
  | "journalEntryLine"
  | "stockDocument"
  | "stockTransaction"
  | "voucher"
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

type JournalLineWithAccount = {
  debit: Prisma.Decimal | number | string
  credit: Prisma.Decimal | number | string
  glAccount: { code: string }
}

type VoucherWithJournal = {
  id: string
  refType: string
  refId: string
  journalEntry: {
    lines: JournalLineWithAccount[]
  } | null
}

type LedgerMoveRow = {
  qtyIn: number
  qtyOut: number
  unitCost: Prisma.Decimal | number | string
}

export function round2Amount(value: Prisma.Decimal | number | string): number {
  return roundMoney(toMoney(value)).toNumber()
}

export function buildIssueId(
  sourceType: "SALE" | "STOCK_DOCUMENT",
  sourceId: string,
  issueType: ReconciliationIssue["issueType"]
): string {
  return `${sourceType}:${sourceId}:${issueType}`
}

export function groupVouchersByRef(
  vouchers: VoucherWithJournal[]
): Map<string, VoucherWithJournal[]> {
  const grouped = new Map<string, VoucherWithJournal[]>()
  for (const voucher of vouchers) {
    const existing = grouped.get(voucher.refId) ?? []
    existing.push(voucher)
    grouped.set(voucher.refId, existing)
  }
  return grouped
}

export function sumJournalSideByAccountCode(
  lines: JournalLineWithAccount[],
  accountCode: string,
  side: "debit" | "credit"
): Prisma.Decimal {
  return lines.reduce((sum, line) => {
    if (line.glAccount.code !== accountCode) return sum
    const amount = side === "debit" ? toMoney(line.debit) : toMoney(line.credit)
    return roundMoney(sum.plus(amount))
  }, toMoney(0))
}

export function expectedInventoryFromLedgerRows(rows: LedgerMoveRow[]): {
  inbound: Prisma.Decimal
  outbound: Prisma.Decimal
} {
  return {
    inbound: sumInboundValueFromLedger(rows),
    outbound: sumOutboundValueFromLedger(rows),
  }
}

function auditSale(
  sale: { id: string; total: Prisma.Decimal | number | string },
  ledgerRows: LedgerMoveRow[],
  vouchers: VoucherWithJournal[]
): ReconciliationIssue[] {
  const issues: ReconciliationIssue[] = []

  if (vouchers.length === 0) {
    issues.push({
      id: buildIssueId("SALE", sale.id, "MISSING_VOUCHER"),
      sourceType: "SALE",
      sourceId: sale.id,
      issueType: "MISSING_VOUCHER",
      severity: "ERROR",
      message: "Completed sale has no posted finance voucher",
    })
    return issues
  }

  if (vouchers.length > 1) {
    issues.push({
      id: buildIssueId("SALE", sale.id, "DUPLICATE_VOUCHER"),
      sourceType: "SALE",
      sourceId: sale.id,
      issueType: "DUPLICATE_VOUCHER",
      severity: "ERROR",
      message: `Completed sale has ${vouchers.length} finance vouchers`,
    })
  }

  const journalLines = vouchers[0].journalEntry?.lines ?? []
  const expectedTotal = round2Amount(sale.total)
  const actualRevenue = round2Amount(
    sumJournalSideByAccountCode(
      journalLines,
      DEFAULT_ACCOUNT_CODES.REVENUE,
      "credit"
    )
  )

  if (expectedTotal !== actualRevenue) {
    issues.push({
      id: buildIssueId("SALE", sale.id, "TOTAL_MISMATCH"),
      sourceType: "SALE",
      sourceId: sale.id,
      issueType: "TOTAL_MISMATCH",
      severity: "ERROR",
      message: "Sale total does not match revenue credit on posted voucher",
      expectedAmount: expectedTotal,
      actualAmount: actualRevenue,
      difference: round2Amount(expectedTotal - actualRevenue),
    })
  }

  const issueRows = ledgerRows.filter((row) => row.qtyOut > 0)
  if (issueRows.length > 0) {
    const expectedCogs = round2Amount(sumCogsFromLedgerIssues(issueRows))
    const actualCogs = round2Amount(
      sumJournalSideByAccountCode(
        journalLines,
        DEFAULT_ACCOUNT_CODES.COGS,
        "debit"
      )
    )

    if (actualCogs === 0 || expectedCogs !== actualCogs) {
      issues.push({
        id: buildIssueId("SALE", sale.id, "MISSING_COGS_LINES"),
        sourceType: "SALE",
        sourceId: sale.id,
        issueType: "MISSING_COGS_LINES",
        severity: "ERROR",
        message: "Sale ledger COGS does not match COGS debit on posted voucher",
        expectedAmount: expectedCogs,
        actualAmount: actualCogs,
        difference: round2Amount(expectedCogs - actualCogs),
      })
    }
  }

  return issues
}

function auditStockDocument(
  doc: { id: string; refNo: string },
  ledgerRows: LedgerMoveRow[],
  vouchers: VoucherWithJournal[]
): ReconciliationIssue[] {
  const issues: ReconciliationIssue[] = []

  if (vouchers.length === 0) {
    issues.push({
      id: buildIssueId("STOCK_DOCUMENT", doc.id, "MISSING_VOUCHER"),
      sourceType: "STOCK_DOCUMENT",
      sourceId: doc.id,
      issueType: "MISSING_VOUCHER",
      severity: "ERROR",
      message: `Posted stock document ${doc.refNo} has no finance voucher`,
    })
    return issues
  }

  if (vouchers.length > 1) {
    issues.push({
      id: buildIssueId("STOCK_DOCUMENT", doc.id, "DUPLICATE_VOUCHER"),
      sourceType: "STOCK_DOCUMENT",
      sourceId: doc.id,
      issueType: "DUPLICATE_VOUCHER",
      severity: "ERROR",
      message: `Posted stock document ${doc.refNo} has ${vouchers.length} finance vouchers`,
    })
  }

  const journalLines = vouchers[0].journalEntry?.lines ?? []
  const { inbound, outbound } = expectedInventoryFromLedgerRows(ledgerRows)

  if (inbound.gt(0)) {
    const expectedAmount = round2Amount(inbound)
    const actualAmount = round2Amount(
      sumJournalSideByAccountCode(
        journalLines,
        DEFAULT_ACCOUNT_CODES.INVENTORY,
        "debit"
      )
    )

    if (expectedAmount !== actualAmount) {
      issues.push({
        id: buildIssueId("STOCK_DOCUMENT", doc.id, "INVENTORY_VALUE_MISMATCH"),
        sourceType: "STOCK_DOCUMENT",
        sourceId: doc.id,
        issueType: "INVENTORY_VALUE_MISMATCH",
        severity: "ERROR",
        message: `Inbound inventory value for ${doc.refNo} does not match inventory debit on posted voucher`,
        expectedAmount,
        actualAmount,
        difference: round2Amount(expectedAmount - actualAmount),
      })
    }
  }

  if (outbound.gt(0)) {
    const expectedAmount = round2Amount(outbound)
    const actualAmount = round2Amount(
      sumJournalSideByAccountCode(
        journalLines,
        DEFAULT_ACCOUNT_CODES.INVENTORY,
        "credit"
      )
    )

    if (expectedAmount !== actualAmount) {
      issues.push({
        id: buildIssueId("STOCK_DOCUMENT", doc.id, "INVENTORY_VALUE_MISMATCH"),
        sourceType: "STOCK_DOCUMENT",
        sourceId: doc.id,
        issueType: "INVENTORY_VALUE_MISMATCH",
        severity: "ERROR",
        message: `Outbound inventory value for ${doc.refNo} does not match inventory credit on posted voucher`,
        expectedAmount,
        actualAmount,
        difference: round2Amount(expectedAmount - actualAmount),
      })
    }
  }

  return issues
}

export async function runFinanceReconciliation(
  prisma: ReconciliationPrisma,
  input: FinanceReconciliationInput = {}
): Promise<ReconciliationSummary> {
  const saleWhere: Prisma.SaleWhereInput = {
    status: SaleStatus.COMPLETED,
  }
  if (input.branchId) {
    saleWhere.branchId = input.branchId
  }
  if (input.fromDate && input.toDate) {
    const { start, endExclusive } = normalizeDateRange({
      from: input.fromDate,
      to: input.toDate,
    })
    saleWhere.createdAt = { gte: start, lt: endExclusive }
  }

  const docWhere: Prisma.StockDocumentWhereInput = {
    status: DocStatus.POSTED,
  }
  if (input.branchId) {
    docWhere.branchId = input.branchId
  }
  if (input.fromDate && input.toDate) {
    const { start, endExclusive } = normalizeDateRange({
      from: input.fromDate,
      to: input.toDate,
    })
    docWhere.postedAt = { gte: start, lt: endExclusive }
  }

  const sales = await prisma.sale.findMany({
    where: saleWhere,
    select: { id: true, total: true },
  })
  const stockDocuments = await prisma.stockDocument.findMany({
    where: docWhere,
    select: { id: true, refNo: true },
  })

  const saleIds = sales.map((sale) => sale.id)
  const documentIds = stockDocuments.map((doc) => doc.id)
  const refIds = [...saleIds, ...documentIds]

  const saleLedgerByRef = new Map<string, LedgerMoveRow[]>()
  const docLedgerByRef = new Map<string, LedgerMoveRow[]>()

  if (saleIds.length > 0) {
    const saleLedgerRows = await prisma.stockTransaction.findMany({
      where: {
        refType: STOCK_REF_TYPES.POS_SALE,
        refId: { in: saleIds },
      },
      select: {
        refId: true,
        qtyIn: true,
        qtyOut: true,
        unitCost: true,
      },
    })

    for (const row of saleLedgerRows) {
      const existing = saleLedgerByRef.get(row.refId) ?? []
      existing.push({
        qtyIn: row.qtyIn,
        qtyOut: row.qtyOut,
        unitCost: row.unitCost,
      })
      saleLedgerByRef.set(row.refId, existing)
    }
  }

  if (documentIds.length > 0) {
    const documentLedgerRows = await prisma.stockTransaction.findMany({
      where: {
        documentId: { in: documentIds },
      },
      select: {
        documentId: true,
        qtyIn: true,
        qtyOut: true,
        unitCost: true,
      },
    })

    for (const row of documentLedgerRows) {
      if (!row.documentId) continue
      const existing = docLedgerByRef.get(row.documentId) ?? []
      existing.push({
        qtyIn: row.qtyIn,
        qtyOut: row.qtyOut,
        unitCost: row.unitCost,
      })
      docLedgerByRef.set(row.documentId, existing)
    }
  }

  const vouchers =
    refIds.length > 0
      ? await prisma.voucher.findMany({
          where: {
            refType: {
              in: [FINANCE_REF_TYPES.POS_SALE, FINANCE_REF_TYPES.STOCK_DOC_POST],
            },
            refId: { in: refIds },
          },
          include: {
            journalEntry: {
              include: {
                lines: {
                  include: {
                    glAccount: {
                      select: { code: true },
                    },
                  },
                },
              },
            },
          },
        })
      : []

  const vouchersByRef = groupVouchersByRef(vouchers as VoucherWithJournal[])
  const issues: ReconciliationIssue[] = []

  for (const sale of sales) {
    issues.push(
      ...auditSale(
        sale,
        saleLedgerByRef.get(sale.id) ?? [],
        vouchersByRef.get(sale.id) ?? []
      )
    )
  }

  for (const doc of stockDocuments) {
    issues.push(
      ...auditStockDocument(
        doc,
        docLedgerByRef.get(doc.id) ?? [],
        vouchersByRef.get(doc.id) ?? []
      )
    )
  }

  return {
    checkedSales: sales.length,
    checkedStockDocuments: stockDocuments.length,
    issueCount: issues.length,
    issues,
  }
}
