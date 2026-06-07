import * as glBalance from "@/lib/finance/gl-balance"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import {
  auditRefund,
  computeVariance,
  reconcileInventory,
  reconcileRefunds,
  reconcileSalesAndTender,
  runFinanceReconciliation,
} from "@/lib/finance/reconciliation"
import * as refundSummary from "@/lib/pos/refund-summary"
import { Prisma } from "@/generated/prisma/client"
import * as salesSummary from "@/lib/pos/sales-summary"
import * as stockSummary from "@/lib/stock/stock-summary"
import { STOCK_REF_TYPES } from "@/lib/stock/transaction-types"

const MUTATION_METHODS = [
  "create",
  "update",
  "delete",
  "upsert",
  "createMany",
  "updateMany",
  "deleteMany",
] as const

type AuditMockOverrides = {
  sales?: Array<{ id: string; total: Prisma.Decimal | number | string }>
  stockDocuments?: Array<{ id: string; refNo: string }>
  saleLedgerRows?: Array<{
    refId: string
    qtyIn: number
    qtyOut: number
    unitCost: Prisma.Decimal | number | string
  }>
  docLedgerRows?: Array<{
    documentId: string
    qtyIn: number
    qtyOut: number
    unitCost: Prisma.Decimal | number | string
  }>
  vouchers?: Array<Record<string, unknown>>
  refunds?: Array<{
    id: string
    amount: Prisma.Decimal | number | string
    refundNo?: string
  }>
}

function makeModel(extra: Record<string, jest.Mock> = {}) {
  const model: Record<string, jest.Mock> = {}
  for (const method of MUTATION_METHODS) {
    model[method] = jest.fn()
  }
  return { ...model, ...extra }
}

function createAuditMockPrisma(overrides: AuditMockOverrides = {}) {
  const prisma = {
    sale: makeModel({
      findMany: jest.fn(async () => overrides.sales ?? []),
    }),
    stockDocument: makeModel({
      findMany: jest.fn(async () => overrides.stockDocuments ?? []),
    }),
    stockTransaction: makeModel({
      findMany: jest.fn(async (args: { where?: Record<string, unknown> }) => {
        if (args?.where?.refType === STOCK_REF_TYPES.POS_SALE) {
          return overrides.saleLedgerRows ?? []
        }
        if (args?.where?.documentId) {
          return overrides.docLedgerRows ?? []
        }
        return []
      }),
    }),
    voucher: makeModel({
      findMany: jest.fn(async (args: { where?: Record<string, unknown> }) => {
        const all = (overrides.vouchers ?? []) as Array<{
          refType: string
          refId: string
        }>
        const where = args?.where ?? {}
        const refTypeFilter = where.refType as
          | string
          | { in?: string[] }
          | undefined
        const refIdFilter = where.refId as { in?: string[] } | undefined

        return all.filter((voucher) => {
          if (typeof refTypeFilter === "string") {
            if (voucher.refType !== refTypeFilter) return false
          } else if (refTypeFilter?.in) {
            if (!refTypeFilter.in.includes(voucher.refType)) return false
          }
          if (refIdFilter?.in) {
            if (!refIdFilter.in.includes(voucher.refId)) return false
          }
          return true
        })
      }),
    }),
    refund: makeModel({
      findMany: jest.fn(async () => overrides.refunds ?? []),
    }),
    stock: makeModel(),
    glAccount: makeModel(),
    journalEntryLine: makeModel(),
    $transaction: jest.fn(),
  }

  return prisma
}

function collectMutationMocks(prisma: ReturnType<typeof createAuditMockPrisma>) {
  const mocks: jest.Mock[] = []
  for (const [key, model] of Object.entries(prisma)) {
    if (key === "$transaction" || typeof model !== "object" || model === null) {
      continue
    }
    for (const method of MUTATION_METHODS) {
      if (model[method]) {
        mocks.push(model[method])
      }
    }
  }
  return mocks
}

function voucherWithJournal(input: {
  id: string
  refType: string
  refId: string
  lines: Array<{ code: string; debit: number; credit: number }>
}) {
  return {
    id: input.id,
    refType: input.refType,
    refId: input.refId,
    journalEntry: {
      lines: input.lines.map((line, index) => ({
        lineNo: index + 1,
        debit: new Prisma.Decimal(line.debit),
        credit: new Prisma.Decimal(line.credit),
        glAccount: { code: line.code },
      })),
    },
  }
}

function matchingSaleVoucher(refId: string, total: number, cogs: number) {
  return voucherWithJournal({
    id: `voucher-${refId}`,
    refType: FINANCE_REF_TYPES.POS_SALE,
    refId,
    lines: [
      { code: DEFAULT_ACCOUNT_CODES.CASH, debit: total, credit: 0 },
      { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: 0, credit: total },
      { code: DEFAULT_ACCOUNT_CODES.COGS, debit: cogs, credit: 0 },
      { code: DEFAULT_ACCOUNT_CODES.INVENTORY, debit: 0, credit: cogs },
    ],
  })
}

function matchingRefundVoucher(refId: string, amount: number) {
  return voucherWithJournal({
    id: `voucher-refund-${refId}`,
    refType: FINANCE_REF_TYPES.POS_REFUND,
    refId,
    lines: [
      { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: amount, credit: 0 },
      { code: DEFAULT_ACCOUNT_CODES.CASH, debit: 0, credit: amount },
    ],
  })
}

function matchingInboundDocVoucher(refId: string, inbound: number) {
  return voucherWithJournal({
    id: `voucher-${refId}`,
    refType: FINANCE_REF_TYPES.STOCK_DOC_POST,
    refId,
    lines: [
      { code: DEFAULT_ACCOUNT_CODES.INVENTORY, debit: inbound, credit: 0 },
      { code: DEFAULT_ACCOUNT_CODES.AP, debit: 0, credit: inbound },
    ],
  })
}

describe("reconciliation variance math", () => {
  it("computes operational minus gl without clamping", () => {
    expect(computeVariance("1000", "995")).toBe("5")
    expect(computeVariance("995", "1000")).toBe("-5")
  })
})

describe("reconcileInventory", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("returns inventory variance DTO from operational and GL totals", async () => {
    jest.spyOn(stockSummary, "getStockSummary").mockResolvedValue({
      valuationMethod: "AVG_COST",
      rows: [],
      totals: { qty: 10, totalValue: "1000.00" },
    })
    jest.spyOn(glBalance, "getGlAccountBalance").mockResolvedValue({
      filter: { accountCodes: ["1000"] },
      accounts: [
        {
          accountCode: "1000",
          accountName: "Inventory",
          accountType: "ASSET",
          debitTotal: "995.00",
          creditTotal: "0.00",
          balance: "995.00",
        },
      ],
      totals: { debitTotal: "995.00", creditTotal: "0.00" },
    })

    const result = await reconcileInventory({} as never, { branchId: "branch-1" })

    expect(result.operationalTotalValue).toBe("1000.00")
    expect(result.glInventoryBalance).toBe("995.00")
    expect(result.variances).toHaveLength(1)
    expect(result.variances[0]).toMatchObject({
      domain: "inventory",
      operationalAmount: "1000.00",
      glAmount: "995.00",
      variance: "5",
    })
  })
})

describe("reconcileSalesAndTender", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("returns revenue and tender variance DTOs", async () => {
    jest.spyOn(salesSummary, "getSalesSummary").mockResolvedValue({
      saleCount: 2,
      revenue: "1500.00",
      paymentBreakdown: [
        { method: "CASH" as never, amount: "900.00", saleCount: 1 },
        { method: "CARD" as never, amount: "600.00", saleCount: 1 },
      ],
      cashierSummary: [],
      productTypeBreakdown: [],
    })
    jest.spyOn(glBalance, "getGlAccountBalance").mockResolvedValue({
      filter: { accountCodes: ["4000", "1100", "1110"] },
      accounts: [
        {
          accountCode: "4000",
          accountName: "Revenue",
          accountType: "REVENUE",
          debitTotal: "0.00",
          creditTotal: "1490.00",
          balance: "1490.00",
        },
        {
          accountCode: "1100",
          accountName: "Cash",
          accountType: "ASSET",
          debitTotal: "895.00",
          creditTotal: "0.00",
          balance: "895.00",
        },
        {
          accountCode: "1110",
          accountName: "Card clearing",
          accountType: "ASSET",
          debitTotal: "600.00",
          creditTotal: "0.00",
          balance: "600.00",
        },
      ],
      totals: { debitTotal: "1495.00", creditTotal: "1490.00" },
    })

    const result = await reconcileSalesAndTender({} as never, {})

    expect(result.variances[0]).toMatchObject({
      domain: "revenue",
      variance: "10",
    })
    expect(result.paymentBreakdown[0]).toMatchObject({
      label: "Cash tender vs cash GL",
      variance: "5",
    })
    expect(result.paymentBreakdown[1]).toMatchObject({
      label: "Card tender vs card clearing GL",
      variance: "0",
    })
  })
})

describe("reconcileRefunds", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("returns zero variance when operational refunds match POS_REFUND GL totals", async () => {
    jest.spyOn(refundSummary, "getRefundSummary").mockResolvedValue({
      refundCount: 1,
      refundTotal: "50.00",
      paymentBreakdown: [
        { method: "CASH" as never, amount: "50.00", saleCount: 1 },
      ],
      missingPaymentCount: 0,
    })

    const prisma = createAuditMockPrisma({
      vouchers: [matchingRefundVoucher("refund-1", 50)],
    })

    const result = await reconcileRefunds(prisma as never, {})

    expect(result.operationalRefundTotal).toBe("50.00")
    expect(result.glRefundRevenueTotal).toBe("50")
    expect(result.variances[0]).toMatchObject({
      domain: "refund",
      variance: "0",
    })
  })

  it("reports variance when operational refunds differ from GL reversal", async () => {
    jest.spyOn(refundSummary, "getRefundSummary").mockResolvedValue({
      refundCount: 1,
      refundTotal: "75.00",
      paymentBreakdown: [
        { method: "CASH" as never, amount: "75.00", saleCount: 1 },
      ],
      missingPaymentCount: 0,
    })

    const prisma = createAuditMockPrisma({
      vouchers: [matchingRefundVoucher("refund-1", 50)],
    })

    const result = await reconcileRefunds(prisma as never, {})

    expect(result.variances[0]).toMatchObject({
      domain: "refund",
      operationalAmount: "75.00",
      glAmount: "50",
      variance: "25",
    })
  })
})

describe("auditRefund", () => {
  it("flags MISSING_VOUCHER when refund has no voucher", () => {
    const issues = auditRefund(
      { id: "refund-1", amount: new Prisma.Decimal("40") },
      []
    )
    expect(issues).toEqual([
      expect.objectContaining({
        sourceType: "REFUND",
        issueType: "MISSING_VOUCHER",
      }),
    ])
  })

  it("flags TOTAL_MISMATCH when revenue debit differs from refund amount", () => {
    const issues = auditRefund(
      { id: "refund-1", amount: new Prisma.Decimal("40") },
      [
        matchingRefundVoucher("refund-1", 30) as never,
      ]
    )
    expect(issues).toEqual([
      expect.objectContaining({
        issueType: "TOTAL_MISMATCH",
        expectedAmount: 40,
        actualAmount: 30,
      }),
    ])
  })
})

describe("runFinanceReconciliation", () => {
  it("A. reports no issues when sale and stock document vouchers match ledger", async () => {
    const prisma = createAuditMockPrisma({
      sales: [{ id: "sale-1", total: new Prisma.Decimal("100.00") }],
      stockDocuments: [{ id: "doc-1", refNo: "PUR-1" }],
      saleLedgerRows: [
        {
          refId: "sale-1",
          qtyIn: 0,
          qtyOut: 2,
          unitCost: new Prisma.Decimal("10.00"),
        },
      ],
      docLedgerRows: [
        {
          documentId: "doc-1",
          qtyIn: 5,
          qtyOut: 0,
          unitCost: new Prisma.Decimal("20.00"),
        },
      ],
      vouchers: [
        matchingSaleVoucher("sale-1", 100, 20),
        matchingInboundDocVoucher("doc-1", 100),
      ],
    })

    const result = await runFinanceReconciliation(prisma as never)

    expect(result.checkedSales).toBe(1)
    expect(result.checkedStockDocuments).toBe(1)
    expect(result.issueCount).toBe(0)
    expect(result.issues).toEqual([])
  })

  it("B. flags MISSING_VOUCHER for a completed sale without a voucher", async () => {
    const prisma = createAuditMockPrisma({
      sales: [{ id: "sale-1", total: new Prisma.Decimal("100.00") }],
    })

    const result = await runFinanceReconciliation(prisma as never)

    expect(result.issues).toEqual([
      expect.objectContaining({
        sourceType: "SALE",
        sourceId: "sale-1",
        issueType: "MISSING_VOUCHER",
        severity: "ERROR",
      }),
    ])
  })

  it("C. flags DUPLICATE_VOUCHER when a sale has multiple vouchers", async () => {
    const prisma = createAuditMockPrisma({
      sales: [{ id: "sale-1", total: new Prisma.Decimal("100.00") }],
      vouchers: [
        matchingSaleVoucher("sale-1", 100, 0),
        matchingSaleVoucher("sale-1", 100, 0),
      ],
    })

    const result = await runFinanceReconciliation(prisma as never)

    expect(result.issues).toEqual([
      expect.objectContaining({
        sourceType: "SALE",
        sourceId: "sale-1",
        issueType: "DUPLICATE_VOUCHER",
      }),
    ])
  })

  it("D. flags TOTAL_MISMATCH with expected and actual revenue amounts", async () => {
    const prisma = createAuditMockPrisma({
      sales: [{ id: "sale-1", total: new Prisma.Decimal("100.00") }],
      vouchers: [
        voucherWithJournal({
          id: "voucher-sale-1",
          refType: FINANCE_REF_TYPES.POS_SALE,
          refId: "sale-1",
          lines: [
            { code: DEFAULT_ACCOUNT_CODES.CASH, debit: 90, credit: 0 },
            { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: 0, credit: 90 },
          ],
        }),
      ],
    })

    const result = await runFinanceReconciliation(prisma as never)

    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "TOTAL_MISMATCH",
        expectedAmount: 100,
        actualAmount: 90,
        difference: 10,
      }),
    ])
  })

  it("E. flags MISSING_COGS_LINES when ledger has qtyOut but voucher COGS debit is zero", async () => {
    const prisma = createAuditMockPrisma({
      sales: [{ id: "sale-1", total: new Prisma.Decimal("100.00") }],
      saleLedgerRows: [
        {
          refId: "sale-1",
          qtyIn: 0,
          qtyOut: 2,
          unitCost: new Prisma.Decimal("10.00"),
        },
      ],
      vouchers: [
        voucherWithJournal({
          id: "voucher-sale-1",
          refType: FINANCE_REF_TYPES.POS_SALE,
          refId: "sale-1",
          lines: [
            { code: DEFAULT_ACCOUNT_CODES.CASH, debit: 100, credit: 0 },
            { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: 0, credit: 100 },
          ],
        }),
      ],
    })

    const result = await runFinanceReconciliation(prisma as never)

    expect(result.issues).toEqual([
      expect.objectContaining({
        issueType: "MISSING_COGS_LINES",
        expectedAmount: 20,
        actualAmount: 0,
        difference: 20,
      }),
    ])
  })

  it("F. flags MISSING_VOUCHER for a posted stock document without a voucher", async () => {
    const prisma = createAuditMockPrisma({
      stockDocuments: [{ id: "doc-1", refNo: "PUR-1" }],
    })

    const result = await runFinanceReconciliation(prisma as never)

    expect(result.issues).toEqual([
      expect.objectContaining({
        sourceType: "STOCK_DOCUMENT",
        sourceId: "doc-1",
        issueType: "MISSING_VOUCHER",
      }),
    ])
  })

  it("G. flags INVENTORY_VALUE_MISMATCH when inbound ledger value differs from inventory debit", async () => {
    const prisma = createAuditMockPrisma({
      stockDocuments: [{ id: "doc-1", refNo: "PUR-1" }],
      docLedgerRows: [
        {
          documentId: "doc-1",
          qtyIn: 5,
          qtyOut: 0,
          unitCost: new Prisma.Decimal("20.00"),
        },
      ],
      vouchers: [matchingInboundDocVoucher("doc-1", 90)],
    })

    const result = await runFinanceReconciliation(prisma as never)

    expect(result.issues).toEqual([
      expect.objectContaining({
        sourceType: "STOCK_DOCUMENT",
        sourceId: "doc-1",
        issueType: "INVENTORY_VALUE_MISMATCH",
        expectedAmount: 100,
        actualAmount: 90,
        difference: 10,
      }),
    ])
  })

  it("H. derives expected inventory from StockTransaction rows, not misleading document-line retail values", async () => {
    const retailLikeValue = 999
    const prisma = createAuditMockPrisma({
      stockDocuments: [{ id: "doc-1", refNo: "ADJ-1" }],
      docLedgerRows: [
        {
          documentId: "doc-1",
          qtyIn: 1,
          qtyOut: 0,
          unitCost: new Prisma.Decimal("50.00"),
        },
      ],
      vouchers: [matchingInboundDocVoucher("doc-1", retailLikeValue)],
    })

    const result = await runFinanceReconciliation(prisma as never)

    const issue = result.issues.find(
      (row) => row.issueType === "INVENTORY_VALUE_MISMATCH"
    )
    expect(issue).toBeDefined()
    expect(issue?.expectedAmount).toBe(50)
    expect(issue?.expectedAmount).not.toBe(retailLikeValue)
    expect(issue?.actualAmount).toBe(retailLikeValue)
  })

  it("J. flags refund audit issues and orphan POS_REFUND vouchers", async () => {
    const prisma = createAuditMockPrisma({
      refunds: [{ id: "refund-1", amount: new Prisma.Decimal("25.00") }],
      vouchers: [
        matchingRefundVoucher("orphan-1", 10),
      ],
    })

    const result = await runFinanceReconciliation(prisma as never)

    expect(result.checkedRefunds).toBe(1)
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: "REFUND",
          sourceId: "refund-1",
          issueType: "MISSING_VOUCHER",
        }),
        expect.objectContaining({
          sourceType: "REFUND",
          sourceId: "orphan-1",
          issueType: "MISSING_REFUND",
        }),
      ])
    )
  })

  it("K. reports no refund issues when voucher matches refund amount", async () => {
    const prisma = createAuditMockPrisma({
      refunds: [{ id: "refund-1", amount: new Prisma.Decimal("25.00") }],
      vouchers: [matchingRefundVoucher("refund-1", 25)],
    })

    const result = await runFinanceReconciliation(prisma as never)

    expect(result.issues.filter((row) => row.sourceType === "REFUND")).toEqual([])
  })

  it("I. performs read-only prisma access and never calls mutation methods", async () => {
    const prisma = createAuditMockPrisma({
      sales: [{ id: "sale-1", total: new Prisma.Decimal("100.00") }],
      stockDocuments: [{ id: "doc-1", refNo: "PUR-1" }],
      vouchers: [
        matchingSaleVoucher("sale-1", 100, 0),
        matchingInboundDocVoucher("doc-1", 100),
      ],
    })

    await runFinanceReconciliation(prisma as never)

    expect(prisma.sale.findMany).toHaveBeenCalled()
    expect(prisma.stockDocument.findMany).toHaveBeenCalled()
    expect(prisma.refund.findMany).toHaveBeenCalled()
    expect(prisma.stockTransaction.findMany).toHaveBeenCalled()
    expect(prisma.voucher.findMany).toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()

    for (const mutation of collectMutationMocks(prisma)) {
      expect(mutation).not.toHaveBeenCalled()
    }
  })
})
