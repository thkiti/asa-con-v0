import * as glBalance from "@/lib/finance/gl-balance"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { buildPosVatEconomics } from "@/lib/finance/pos-sale-vat"
import { VAT_OUTPUT_STANDARD_TAX_CODE } from "@/lib/finance/tax-policy"
import {
  auditRefund,
  computeVariance,
  reconcileInventory,
  reconcileRefunds,
  reconcileSalesAndTender,
  runFinanceReconciliation,
} from "@/lib/finance/reconciliation"
import * as refundSummary from "@/lib/pos/refund-summary"
import { Prisma, PaymentMethod } from "@/generated/prisma/client"
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

function stage1Economics(gross: number, rateBps = 700) {
  return buildPosVatEconomics(String(gross), {
    taxCode: VAT_OUTPUT_STANDARD_TAX_CODE,
    rateBps,
    inclusive: true,
    outputVatAccountCode: DEFAULT_ACCOUNT_CODES.OUTPUT_VAT,
  })
}

function matchingSaleVoucher(
  refId: string,
  gross: number,
  cogs: number,
  tenderCode = DEFAULT_ACCOUNT_CODES.CASH
) {
  const econ = stage1Economics(gross)
  const lines = [
    { code: tenderCode, debit: gross, credit: 0 },
    { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: 0, credit: Number(econ.net) },
    {
      code: DEFAULT_ACCOUNT_CODES.OUTPUT_VAT,
      debit: 0,
      credit: Number(econ.vat),
    },
  ]
  if (cogs > 0) {
    lines.push(
      { code: DEFAULT_ACCOUNT_CODES.COGS, debit: cogs, credit: 0 },
      { code: DEFAULT_ACCOUNT_CODES.INVENTORY, debit: 0, credit: cogs }
    )
  }
  return voucherWithJournal({
    id: `voucher-${refId}`,
    refType: FINANCE_REF_TYPES.POS_SALE,
    refId,
    lines,
  })
}

function matchingRefundVoucher(
  refId: string,
  gross: number,
  tenderCode = DEFAULT_ACCOUNT_CODES.CASH
) {
  const econ = stage1Economics(gross)
  return voucherWithJournal({
    id: `voucher-refund-${refId}`,
    refType: FINANCE_REF_TYPES.POS_REFUND,
    refId,
    lines: [
      { code: DEFAULT_ACCOUNT_CODES.REVENUE, debit: Number(econ.net), credit: 0 },
      {
        code: DEFAULT_ACCOUNT_CODES.OUTPUT_VAT,
        debit: Number(econ.vat),
        credit: 0,
      },
      { code: tenderCode, debit: 0, credit: gross },
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

  function mockStage1GlBalances(
    input: {
      netRevenue: string
      outputVat: string
      cash?: string
      card?: string
      bankTransfer?: string
      other?: string
    }
  ) {
    jest.spyOn(glBalance, "getGlAccountBalance").mockResolvedValue({
      filter: {
        accountCodes: [
          DEFAULT_ACCOUNT_CODES.REVENUE,
          DEFAULT_ACCOUNT_CODES.OUTPUT_VAT,
          DEFAULT_ACCOUNT_CODES.CASH,
          DEFAULT_ACCOUNT_CODES.CARD_CLEARING,
          DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING,
          DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING,
        ],
      },
      accounts: [
        {
          accountCode: DEFAULT_ACCOUNT_CODES.REVENUE,
          accountName: "Revenue",
          accountType: "REVENUE",
          debitTotal: "0.00",
          creditTotal: input.netRevenue,
          balance: input.netRevenue,
        },
        {
          accountCode: DEFAULT_ACCOUNT_CODES.OUTPUT_VAT,
          accountName: "Output VAT",
          accountType: "LIABILITY",
          debitTotal: "0.00",
          creditTotal: input.outputVat,
          balance: input.outputVat,
        },
        {
          accountCode: DEFAULT_ACCOUNT_CODES.CASH,
          accountName: "Cash",
          accountType: "ASSET",
          debitTotal: input.cash ?? "0.00",
          creditTotal: "0.00",
          balance: input.cash ?? "0.00",
        },
        {
          accountCode: DEFAULT_ACCOUNT_CODES.CARD_CLEARING,
          accountName: "Card clearing",
          accountType: "ASSET",
          debitTotal: input.card ?? "0.00",
          creditTotal: "0.00",
          balance: input.card ?? "0.00",
        },
        {
          accountCode: DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING,
          accountName: "Bank transfer clearing",
          accountType: "ASSET",
          debitTotal: input.bankTransfer ?? "0.00",
          creditTotal: "0.00",
          balance: input.bankTransfer ?? "0.00",
        },
        {
          accountCode: DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING,
          accountName: "POS other clearing",
          accountType: "ASSET",
          debitTotal: input.other ?? "0.00",
          creditTotal: "0.00",
          balance: input.other ?? "0.00",
        },
      ],
      totals: { debitTotal: "0.00", creditTotal: "0.00" },
    })
  }

  it("reconciles sale only 107 gross @ 7% with zero variance", async () => {
    jest.spyOn(salesSummary, "getSalesSummary").mockResolvedValue({
      saleCount: 1,
      revenue: "107.00",
      paymentBreakdown: [
        { method: "CASH" as never, amount: "107.00", saleCount: 1 },
      ],
      cashierSummary: [],
      productTypeBreakdown: [],
    })
    jest.spyOn(refundSummary, "getRefundSummary").mockResolvedValue({
      refundCount: 0,
      refundTotal: "0.00",
      paymentBreakdown: [],
      missingPaymentCount: 0,
    })
    mockStage1GlBalances({
      netRevenue: "100.00",
      outputVat: "7.00",
      cash: "107.00",
    })

    const result = await reconcileSalesAndTender({} as never, {})

    expect(result).toMatchObject({
      operationalGrossSales: "107.00",
      operationalGrossRefunds: "0.00",
      operationalNetGross: "107.00",
      glNetRevenue: "100.00",
      glOutputVat: "7.00",
      glGrossEquivalent: "107.00",
      salesVariance: "0.00",
      operationalTenderNet: "107.00",
      glTenderClearingNet: "107.00",
      tenderVariance: "0.00",
      operationalRevenue: "107.00",
      glRevenueBalance: "107.00",
    })
  })

  it("reconciles sale + full refund 107 gross with zero variance", async () => {
    jest.spyOn(salesSummary, "getSalesSummary").mockResolvedValue({
      saleCount: 1,
      revenue: "107.00",
      paymentBreakdown: [
        { method: "CASH" as never, amount: "107.00", saleCount: 1 },
      ],
      cashierSummary: [],
      productTypeBreakdown: [],
    })
    jest.spyOn(refundSummary, "getRefundSummary").mockResolvedValue({
      refundCount: 1,
      refundTotal: "107.00",
      paymentBreakdown: [
        { method: "CASH" as never, amount: "107.00", saleCount: 1 },
      ],
      missingPaymentCount: 0,
    })
    mockStage1GlBalances({
      netRevenue: "0.00",
      outputVat: "0.00",
      cash: "0.00",
    })

    const result = await reconcileSalesAndTender({} as never, {})

    expect(result.operationalNetGross).toBe("0.00")
    expect(result.glGrossEquivalent).toBe("0.00")
    expect(result.salesVariance).toBe("0.00")
    expect(result.tenderVariance).toBe("0.00")
  })

  it("does not compare gross sales to GL 4000 alone", async () => {
    jest.spyOn(salesSummary, "getSalesSummary").mockResolvedValue({
      saleCount: 1,
      revenue: "107.00",
      paymentBreakdown: [
        { method: "CASH" as never, amount: "107.00", saleCount: 1 },
      ],
      cashierSummary: [],
      productTypeBreakdown: [],
    })
    jest.spyOn(refundSummary, "getRefundSummary").mockResolvedValue({
      refundCount: 0,
      refundTotal: "0.00",
      paymentBreakdown: [],
      missingPaymentCount: 0,
    })
    mockStage1GlBalances({
      netRevenue: "100.00",
      outputVat: "0.00",
      cash: "107.00",
    })

    const result = await reconcileSalesAndTender({} as never, {})

    expect(result.salesVariance).toBe("7.00")
    expect(result.variances[0]?.label).toContain("net revenue + output VAT")
  })

  it("returns tender breakdown for Stage 1 clearing accounts", async () => {
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
    jest.spyOn(refundSummary, "getRefundSummary").mockResolvedValue({
      refundCount: 0,
      refundTotal: "0.00",
      paymentBreakdown: [],
      missingPaymentCount: 0,
    })
    mockStage1GlBalances({
      netRevenue: "1401.87",
      outputVat: "98.13",
      cash: "895.00",
      card: "600.00",
    })

    const result = await reconcileSalesAndTender({} as never, {})

    expect(result.salesVariance).toBe("0.00")
    expect(result.paymentBreakdown[0]).toMatchObject({
      label: expect.stringContaining(DEFAULT_ACCOUNT_CODES.CASH),
      variance: "5.00",
    })
    expect(result.paymentBreakdown[1]).toMatchObject({
      label: expect.stringContaining(DEFAULT_ACCOUNT_CODES.CARD_CLEARING),
      variance: "0.00",
    })
  })
})

describe("reconcileRefunds", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  function mockRefundSummary(input: {
    total: string
    paymentBreakdown: Array<{ method: string; amount: string; saleCount: number }>
  }) {
    jest.spyOn(refundSummary, "getRefundSummary").mockResolvedValue({
      refundCount: input.paymentBreakdown.length,
      refundTotal: input.total,
      paymentBreakdown: input.paymentBreakdown as never,
      missingPaymentCount: 0,
    })
  }

  function tenderVariance(result: Awaited<ReturnType<typeof reconcileRefunds>>, accountCode: string) {
    return result.paymentBreakdown.find((row) => row.label.includes(`(${accountCode})`))
  }

  it("returns zero variance when operational refunds match POS_REFUND GL totals", async () => {
    mockRefundSummary({
      total: "50.00",
      paymentBreakdown: [{ method: "CASH", amount: "50.00", saleCount: 1 }],
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
    expect(result.paymentBreakdown).toHaveLength(4)
    expect(tenderVariance(result, DEFAULT_ACCOUNT_CODES.CASH)).toMatchObject({ variance: "0.00" })
  })

  it("reports variance when operational refunds differ from GL reversal", async () => {
    mockRefundSummary({
      total: "75.00",
      paymentBreakdown: [{ method: "CASH", amount: "75.00", saleCount: 1 }],
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

  it("reconciles CASH refund 107 @ 7% with zero economics and tender variance", async () => {
    mockRefundSummary({
      total: "107.00",
      paymentBreakdown: [{ method: "CASH", amount: "107.00", saleCount: 1 }],
    })

    const prisma = createAuditMockPrisma({
      vouchers: [matchingRefundVoucher("refund-1", 107, DEFAULT_ACCOUNT_CODES.CASH)],
    })

    const result = await reconcileRefunds(prisma as never, {})

    const econ = stage1Economics(107)
    expect(result.variances[0]).toMatchObject({
      domain: "refund",
      operationalAmount: "107.00",
      glAmount: "107",
      variance: "0",
    })
    expect(tenderVariance(result, DEFAULT_ACCOUNT_CODES.CASH)).toMatchObject({
      operationalAmount: "107.00",
      glAmount: "107.00",
      variance: "0.00",
    })
    expect(Number(econ.net)).toBe(100)
    expect(Number(econ.vat)).toBe(7)
  })

  it("reconciles CARD refund to 1110 card clearing credit", async () => {
    mockRefundSummary({
      total: "107.00",
      paymentBreakdown: [{ method: "CARD", amount: "107.00", saleCount: 1 }],
    })

    const prisma = createAuditMockPrisma({
      vouchers: [
        matchingRefundVoucher("refund-1", 107, DEFAULT_ACCOUNT_CODES.CARD_CLEARING),
      ],
    })

    const result = await reconcileRefunds(prisma as never, {})

    expect(tenderVariance(result, DEFAULT_ACCOUNT_CODES.CARD_CLEARING)).toMatchObject({
      operationalAmount: "107.00",
      glAmount: "107.00",
      variance: "0.00",
    })
    expect(tenderVariance(result, DEFAULT_ACCOUNT_CODES.CASH)?.variance).toBe("0.00")
    expect(tenderVariance(result, DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING)?.variance).toBe("0.00")
  })

  it.each([
    ["QR", PaymentMethod.QR],
    ["TRANSFER", PaymentMethod.TRANSFER],
    ["BANK_TRANSFER", PaymentMethod.BANK_TRANSFER],
  ] as const)("reconciles %s refund to 1120 bank transfer clearing credit", async (_label, method) => {
    mockRefundSummary({
      total: "107.00",
      paymentBreakdown: [{ method, amount: "107.00", saleCount: 1 }],
    })

    const prisma = createAuditMockPrisma({
      vouchers: [
        matchingRefundVoucher(
          "refund-1",
          107,
          DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING
        ),
      ],
    })

    const result = await reconcileRefunds(prisma as never, {})

    expect(tenderVariance(result, DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING)).toMatchObject({
      operationalAmount: "107.00",
      glAmount: "107.00",
      variance: "0.00",
    })
    expect(tenderVariance(result, DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING)?.variance).toBe("0.00")
  })

  it("reconciles OTHER refund to 1190 only, not 1120", async () => {
    mockRefundSummary({
      total: "107.00",
      paymentBreakdown: [{ method: "OTHER", amount: "107.00", saleCount: 1 }],
    })

    const prisma = createAuditMockPrisma({
      vouchers: [
        matchingRefundVoucher(
          "refund-1",
          107,
          DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING
        ),
      ],
    })

    const result = await reconcileRefunds(prisma as never, {})

    expect(tenderVariance(result, DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING)).toMatchObject({
      operationalAmount: "107.00",
      glAmount: "107.00",
      variance: "0.00",
    })
    expect(tenderVariance(result, DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING)).toMatchObject({
      operationalAmount: "0.00",
      glAmount: "0.00",
      variance: "0.00",
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
