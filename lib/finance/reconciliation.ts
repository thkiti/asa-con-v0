import {
  DocStatus,
  Prisma,
  SaleStatus,
  type PrismaClient,
} from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "./account-map"
import { addMoney, roundMoney, toMoney, ZERO } from "./decimal"
import { getGlAccountBalance } from "./gl-balance"
import {
  buildPosRefundTenderReconciliationRows,
  buildPosTenderReconciliationRows,
  computePosSalesReconciliationMetrics,
  POS_SALES_ECONOMICS_GL_ACCOUNT_CODES,
  POS_STAGE1_TENDER_ACCOUNT_CODES,
  sumPaymentBreakdownTotal,
  sumTenderClearingGlNet,
} from "./pos-sales-reconciliation"
import { ReconciliationError } from "./reconciliation-errors"
import type {
  FinanceReconciliationInput,
  InventoryReconciliationFilter,
  InventoryReconciliationResult,
  ReconciliationIssue,
  ReconciliationSummary,
  ReconciliationVariance,
  RefundReconciliationFilter,
  RefundReconciliationResult,
  SalesReconciliationFilter,
  SalesReconciliationResult,
} from "./reconciliation-types"
import { FINANCE_REF_TYPES } from "./posting-types"
import {
  getRefundSummary,
} from "@/lib/pos/refund-summary"
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
  | "refund"
>

export type PosRefundGlTotals = {
  revenueDebitTotal: string
  outputVatDebitTotal: string
  grossReversalTotal: string
  tenderCreditByAccountCode: Record<string, string>
  /** @deprecated use tenderCreditByAccountCode[1100] */
  cashCreditTotal: string
  /** @deprecated use tenderCreditByAccountCode[1110] */
  cardCreditTotal: string
}

function buildVoucherDateWhere(
  filter: { branchId?: string; from?: Date | string; to?: Date | string }
): Prisma.VoucherWhereInput {
  const where: Prisma.VoucherWhereInput = {
    refType: FINANCE_REF_TYPES.POS_REFUND,
  }
  if (filter.branchId) {
    where.branchId = filter.branchId
  }
  if (filter.from != null && filter.to != null) {
    const range = normalizeDateRange({ from: filter.from, to: filter.to })
    where.date = { gte: range.start, lt: range.endExclusive }
  }
  return where
}

export async function sumPosRefundGlTotals(
  prisma: ReconciliationPrisma,
  filter: RefundReconciliationFilter = {}
): Promise<PosRefundGlTotals> {
  const vouchers = await prisma.voucher.findMany({
    where: buildVoucherDateWhere(filter),
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

  let revenueDebit = ZERO
  let outputVatDebit = ZERO
  const tenderCreditByAccountCode: Record<string, ReturnType<typeof toMoney>> = {}
  for (const code of POS_STAGE1_TENDER_ACCOUNT_CODES) {
    tenderCreditByAccountCode[code] = ZERO
  }

  for (const voucher of vouchers) {
    const lines = (voucher.journalEntry?.lines ?? []) as JournalLineWithAccount[]
    revenueDebit = addMoney(
      revenueDebit,
      sumJournalSideByAccountCode(
        lines,
        DEFAULT_ACCOUNT_CODES.REVENUE,
        "debit"
      )
    )
    outputVatDebit = addMoney(
      outputVatDebit,
      sumJournalSideByAccountCode(
        lines,
        DEFAULT_ACCOUNT_CODES.OUTPUT_VAT,
        "debit"
      )
    )
    for (const code of POS_STAGE1_TENDER_ACCOUNT_CODES) {
      tenderCreditByAccountCode[code] = addMoney(
        tenderCreditByAccountCode[code],
        sumJournalSideByAccountCode(lines, code, "credit")
      )
    }
  }

  const grossReversalTotal = addMoney(revenueDebit, outputVatDebit)

  return {
    revenueDebitTotal: revenueDebit.toString(),
    outputVatDebitTotal: outputVatDebit.toString(),
    grossReversalTotal: grossReversalTotal.toString(),
    tenderCreditByAccountCode: Object.fromEntries(
      POS_STAGE1_TENDER_ACCOUNT_CODES.map((code) => [
        code,
        tenderCreditByAccountCode[code].toString(),
      ])
    ),
    cashCreditTotal: tenderCreditByAccountCode[DEFAULT_ACCOUNT_CODES.CASH].toString(),
    cardCreditTotal:
      tenderCreditByAccountCode[DEFAULT_ACCOUNT_CODES.CARD_CLEARING].toString(),
  }
}

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
  const [salesSummary, refundSummary] = await Promise.all([
    getSalesSummary(prisma, {
      branchId: filter.branchId,
      from: filter.from,
      to: filter.to,
    }),
    getRefundSummary(prisma, {
      branchId: filter.branchId,
      from: filter.from,
      to: filter.to,
    }),
  ])

  const glBalance = await getGlAccountBalance(prisma, {
    accountCodes: [
      ...POS_SALES_ECONOMICS_GL_ACCOUNT_CODES,
      ...POS_STAGE1_TENDER_ACCOUNT_CODES,
    ],
    branchId: filter.branchId,
    from: filter.from,
    to: filter.to,
  })

  const glNetRevenue = glBalanceForCode(
    glBalance.accounts,
    DEFAULT_ACCOUNT_CODES.REVENUE
  )
  const glOutputVat = glBalanceForCode(
    glBalance.accounts,
    DEFAULT_ACCOUNT_CODES.OUTPUT_VAT
  )

  const operationalGrossSales = salesSummary.revenue
  const operationalGrossRefunds = refundSummary.refundTotal
  const operationalTenderIn = sumPaymentBreakdownTotal(salesSummary.paymentBreakdown)
  const operationalTenderRefundOut = sumPaymentBreakdownTotal(
    refundSummary.paymentBreakdown
  )
  const glTenderClearingNet = sumTenderClearingGlNet(glBalance.accounts)

  const metrics = computePosSalesReconciliationMetrics({
    operationalGrossSales,
    operationalGrossRefunds,
    glNetRevenue,
    glOutputVat,
    operationalTenderIn,
    operationalTenderRefundOut,
    glTenderClearingNet,
  })

  const tenderRows = buildPosTenderReconciliationRows({
    salesBreakdown: salesSummary.paymentBreakdown,
    refundBreakdown: refundSummary.paymentBreakdown,
    glAccounts: glBalance.accounts,
  })

  const paymentBreakdown: ReconciliationVariance[] = tenderRows.map((row) => ({
    domain: "tender",
    label: row.label,
    operationalAmount: row.operationalAmount,
    glAmount: row.glAmount,
    variance: row.variance,
  }))

  const salesVarianceRow: ReconciliationVariance = {
    domain: "revenue",
    label: "POS gross sales (net of refunds) vs GL net revenue + output VAT",
    operationalAmount: metrics.operationalNetGross,
    glAmount: metrics.glGrossEquivalent,
    variance: metrics.salesVariance,
  }

  const tenderVarianceRow: ReconciliationVariance = {
    domain: "tender",
    label: "POS tender net vs Stage 1 clearing/custody GL",
    operationalAmount: metrics.operationalTenderNet,
    glAmount: metrics.glTenderClearingNet,
    variance: metrics.tenderVariance,
  }

  return {
    filter,
    ...metrics,
    operationalRevenue: metrics.operationalNetGross,
    glRevenueBalance: metrics.glGrossEquivalent,
    paymentBreakdown,
    variances: [salesVarianceRow, tenderVarianceRow, ...paymentBreakdown],
  }
}

export async function reconcileRefunds(
  prisma: ReconciliationPrisma,
  filter: RefundReconciliationFilter = {}
): Promise<RefundReconciliationResult> {
  const refundSummary = await getRefundSummary(prisma, {
    branchId: filter.branchId,
    from: filter.from,
    to: filter.to,
  })
  const glTotals = await sumPosRefundGlTotals(prisma, filter)

  const refundVariance = buildVariance({
    domain: "refund",
    label: "Refund gross vs GL net revenue + output VAT reversal",
    operationalAmount: refundSummary.refundTotal,
    glAmount: glTotals.grossReversalTotal,
  })

  const tenderRows = buildPosRefundTenderReconciliationRows({
    refundBreakdown: refundSummary.paymentBreakdown,
    glTenderCreditByAccountCode: glTotals.tenderCreditByAccountCode,
  })

  const paymentBreakdown: ReconciliationVariance[] = tenderRows.map((row) => ({
    domain: "tender",
    label: row.label,
    operationalAmount: row.operationalAmount,
    glAmount: row.glAmount,
    variance: row.variance,
  }))

  return {
    filter,
    operationalRefundTotal: refundSummary.refundTotal,
    glRefundRevenueTotal: glTotals.grossReversalTotal,
    paymentBreakdown,
    variances: [refundVariance, ...paymentBreakdown],
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
  sourceType: "SALE" | "STOCK_DOCUMENT" | "REFUND",
  sourceId: string,
  issueType: ReconciliationIssue["issueType"]
): string {
  return `${sourceType}:${sourceId}:${issueType}`
}

export function voucherGroupKey(refType: string, refId: string): string {
  return `${refType}:${refId}`
}

export function groupVouchersByRef(
  vouchers: VoucherWithJournal[]
): Map<string, VoucherWithJournal[]> {
  const grouped = new Map<string, VoucherWithJournal[]>()
  for (const voucher of vouchers) {
    const key = voucherGroupKey(voucher.refType, voucher.refId)
    const existing = grouped.get(key) ?? []
    existing.push(voucher)
    grouped.set(key, existing)
  }
  return grouped
}

function vouchersForOperationalRef(
  grouped: Map<string, VoucherWithJournal[]>,
  refType: string,
  refId: string
): VoucherWithJournal[] {
  return grouped.get(voucherGroupKey(refType, refId)) ?? []
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
  sale: {
    id: string
    total: Prisma.Decimal | number | string
    outputVatAccountCode?: string | null
  },
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
  const expectedGross = round2Amount(sale.total)
  const outputVatCode =
    sale.outputVatAccountCode ?? DEFAULT_ACCOUNT_CODES.OUTPUT_VAT
  const actualNetRevenue = round2Amount(
    sumJournalSideByAccountCode(
      journalLines,
      DEFAULT_ACCOUNT_CODES.REVENUE,
      "credit"
    ).minus(
      sumJournalSideByAccountCode(
        journalLines,
        DEFAULT_ACCOUNT_CODES.REVENUE,
        "debit"
      )
    )
  )
  const actualOutputVat = round2Amount(
    sumJournalSideByAccountCode(journalLines, outputVatCode, "credit").minus(
      sumJournalSideByAccountCode(journalLines, outputVatCode, "debit")
    )
  )
  const actualGrossEquivalent = round2Amount(actualNetRevenue + actualOutputVat)

  if (expectedGross !== actualGrossEquivalent) {
    issues.push({
      id: buildIssueId("SALE", sale.id, "TOTAL_MISMATCH"),
      sourceType: "SALE",
      sourceId: sale.id,
      issueType: "TOTAL_MISMATCH",
      severity: "ERROR",
      message:
        "Sale gross total does not match net revenue + output VAT credits on posted voucher",
      expectedAmount: expectedGross,
      actualAmount: actualGrossEquivalent,
      difference: round2Amount(expectedGross - actualGrossEquivalent),
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

export function auditRefund(
  refund: {
    id: string
    amount: Prisma.Decimal | number | string
    sale?: { outputVatAccountCode?: string | null } | null
  },
  vouchers: VoucherWithJournal[]
): ReconciliationIssue[] {
  const issues: ReconciliationIssue[] = []

  if (vouchers.length === 0) {
    issues.push({
      id: buildIssueId("REFUND", refund.id, "MISSING_VOUCHER"),
      sourceType: "REFUND",
      sourceId: refund.id,
      issueType: "MISSING_VOUCHER",
      severity: "ERROR",
      message: "Refund has no posted finance voucher",
    })
    return issues
  }

  if (vouchers.length > 1) {
    issues.push({
      id: buildIssueId("REFUND", refund.id, "DUPLICATE_VOUCHER"),
      sourceType: "REFUND",
      sourceId: refund.id,
      issueType: "DUPLICATE_VOUCHER",
      severity: "ERROR",
      message: `Refund has ${vouchers.length} finance vouchers`,
    })
  }

  const journalLines = vouchers[0].journalEntry?.lines ?? []
  const expectedGross = round2Amount(refund.amount)
  const outputVatCode =
    refund.sale?.outputVatAccountCode ?? DEFAULT_ACCOUNT_CODES.OUTPUT_VAT
  const actualNetRevenue = round2Amount(
    sumJournalSideByAccountCode(
      journalLines,
      DEFAULT_ACCOUNT_CODES.REVENUE,
      "debit"
    )
  )
  const actualOutputVat = round2Amount(
    sumJournalSideByAccountCode(journalLines, outputVatCode, "debit")
  )
  const actualGrossEquivalent = round2Amount(actualNetRevenue + actualOutputVat)

  if (expectedGross !== actualGrossEquivalent) {
    issues.push({
      id: buildIssueId("REFUND", refund.id, "TOTAL_MISMATCH"),
      sourceType: "REFUND",
      sourceId: refund.id,
      issueType: "TOTAL_MISMATCH",
      severity: "ERROR",
      message:
        "Refund gross amount does not match net revenue + output VAT debits on posted voucher",
      expectedAmount: expectedGross,
      actualAmount: actualGrossEquivalent,
      difference: round2Amount(expectedGross - actualGrossEquivalent),
    })
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

  const refundWhere: Prisma.RefundWhereInput = {}
  if (input.branchId) {
    refundWhere.branchId = input.branchId
  }
  if (input.fromDate && input.toDate) {
    const { start, endExclusive } = normalizeDateRange({
      from: input.fromDate,
      to: input.toDate,
    })
    refundWhere.createdAt = { gte: start, lt: endExclusive }
  }

  const sales = await prisma.sale.findMany({
    where: saleWhere,
    select: { id: true, total: true, outputVatAccountCode: true },
  })
  const stockDocuments = await prisma.stockDocument.findMany({
    where: docWhere,
    select: { id: true, refNo: true },
  })
  const refunds = await prisma.refund.findMany({
    where: refundWhere,
    select: {
      id: true,
      amount: true,
      refundNo: true,
      sale: { select: { outputVatAccountCode: true } },
    },
  })

  const saleIds = sales.map((sale) => sale.id)
  const documentIds = stockDocuments.map((doc) => doc.id)
  const refundIds = refunds.map((refund) => refund.id)
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

  const saleDocVouchers =
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

  const refundVoucherWhere = buildVoucherDateWhere({
    branchId: input.branchId,
    from: input.fromDate,
    to: input.toDate,
  })
  const refundVouchers = await prisma.voucher.findMany({
    where: refundVoucherWhere,
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

  const vouchers = [...saleDocVouchers, ...refundVouchers]
  const vouchersByRef = groupVouchersByRef(vouchers as VoucherWithJournal[])
  const issues: ReconciliationIssue[] = []
  const refundIdSet = new Set(refundIds)

  for (const sale of sales) {
    issues.push(
      ...auditSale(
        sale,
        saleLedgerByRef.get(sale.id) ?? [],
        vouchersForOperationalRef(
          vouchersByRef,
          FINANCE_REF_TYPES.POS_SALE,
          sale.id
        )
      )
    )
  }

  for (const doc of stockDocuments) {
    issues.push(
      ...auditStockDocument(
        doc,
        docLedgerByRef.get(doc.id) ?? [],
        vouchersForOperationalRef(
          vouchersByRef,
          FINANCE_REF_TYPES.STOCK_DOC_POST,
          doc.id
        )
      )
    )
  }

  for (const refund of refunds) {
    issues.push(
      ...auditRefund(
        refund,
        vouchersForOperationalRef(
          vouchersByRef,
          FINANCE_REF_TYPES.POS_REFUND,
          refund.id
        )
      )
    )
  }

  for (const voucher of refundVouchers) {
    if (!refundIdSet.has(voucher.refId)) {
      issues.push({
        id: buildIssueId("REFUND", voucher.refId, "MISSING_REFUND"),
        sourceType: "REFUND",
        sourceId: voucher.refId,
        issueType: "MISSING_REFUND",
        severity: "ERROR",
        message: `POS_REFUND voucher references missing refund ${voucher.refId}`,
      })
    }
  }

  return {
    checkedSales: sales.length,
    checkedStockDocuments: stockDocuments.length,
    checkedRefunds: refunds.length,
    issueCount: issues.length,
    issues,
  }
}
