import { Prisma, PaymentMethod, AccountingPeriodStatus } from "@/generated/prisma/client"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { testVatEconomicsForGross } from "../../finance/helpers/pos-vat-fixtures"
import { aggregateHistoricalPostingPlan } from "@/lib/pos/historical-sale-posting/aggregate"
import {
  classifyHistoricalSaleCandidate,
  createEmptySkipCounts,
  incrementSkipCount,
  isInstantInHistoricalRange,
} from "@/lib/pos/historical-sale-posting/classify"
import {
  parseHistoricalPostingArgs,
  validateHistoricalPostingExecute,
} from "@/lib/pos/historical-sale-posting/cli-args"
import {
  DEFAULT_HISTORICAL_BEFORE,
  DEFAULT_HISTORICAL_FROM,
  HISTORICAL_POS_POSTING_CONFIRM_TOKEN,
} from "@/lib/pos/historical-sale-posting/constants"
import {
  computeHistoricalSaleEconomics,
  reconcileHistoricalPostingSummaries,
} from "@/lib/pos/historical-sale-posting/economics"
import { executeHistoricalPosSalePosting } from "@/lib/pos/historical-sale-posting/execute"
import {
  buildHistoricalPostingCsvContent,
  historicalPostingCsvFilename,
} from "@/lib/pos/historical-sale-posting/export-csv"
import { parseHistoricalPostingDateRange } from "@/lib/pos/historical-sale-posting/date-range"
import { planHistoricalPosSalePosting } from "@/lib/pos/historical-sale-posting/plan"
import { vatVerificationFromGross } from "@/lib/pos/historical-sale-posting/vat-verification"
import type { HistoricalPostingEligibleRow } from "@/lib/pos/historical-sale-posting/types"
import { buildHistoricalSampleRow } from "@/lib/pos/historical-sale-posting/aggregate"

jest.mock("@/lib/finance/posting", () => ({
  postSaleVoucher: jest.fn(),
}))

import { postSaleVoucher } from "@/lib/finance/posting"

const range = parseHistoricalPostingDateRange(
  DEFAULT_HISTORICAL_FROM,
  DEFAULT_HISTORICAL_BEFORE
)

function makeEligibleRow(input: {
  saleId: string
  branchCode: string
  branchName: string
  receiptNo: string
  total?: string
}): HistoricalPostingEligibleRow {
  const vatEconomics = testVatEconomicsForGross(input.total ?? "107")
  const total = new Prisma.Decimal(input.total ?? "107")
  const economics = computeHistoricalSaleEconomics({
    total,
    paymentMethod: PaymentMethod.CASH,
    ledgerRows: [],
    vatEconomics,
  })

  return {
    saleId: input.saleId,
    branchId: `branch-${input.branchCode}`,
    branchCode: input.branchCode,
    branchName: input.branchName,
    receiptNo: input.receiptNo,
    sale: {
      id: input.saleId,
      branchId: `branch-${input.branchCode}`,
      total,
      createdAt: new Date("2026-02-15T10:00:00+07:00"),
      netAmount: vatEconomics.net,
      vatAmount: vatEconomics.vat,
      vatRateBps: vatEconomics.rateBps,
      taxCode: vatEconomics.taxCode,
      outputVatAccountCode: vatEconomics.outputVatAccountCode,
    },
    payment: { method: PaymentMethod.CASH },
    ledgerRows: [],
    vatEconomics,
    economics,
    sample: buildHistoricalSampleRow({
      saleId: input.saleId,
      receiptNo: input.receiptNo,
      branchCode: input.branchCode,
      branchName: input.branchName,
      createdAt: new Date("2026-02-15T10:00:00+07:00"),
      total,
      cogs: new Prisma.Decimal(0),
    }),
  }
}

describe("historical-sale-posting", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("defaults to dry run without execute flag", () => {
    const cli = parseHistoricalPostingArgs([])
    expect(cli.execute).toBe(false)
    expect(cli.fromDateKey).toBe(DEFAULT_HISTORICAL_FROM)
    expect(cli.beforeDateKey).toBe(DEFAULT_HISTORICAL_BEFORE)
  })

  it("parses month shortcut, branch filter, and csv flag", () => {
    const cli = parseHistoricalPostingArgs([
      "--month=2026-01",
      "--branch=SH001",
      "--limit=25",
      "--csv",
    ])
    expect(cli.fromDateKey).toBe("2026-01-01")
    expect(cli.beforeDateKey).toBe("2026-02-01")
    expect(cli.branchCode).toBe("SH001")
    expect(cli.limit).toBe(25)
    expect(cli.csv).toBe(true)
    expect(cli.monthKey).toBe("2026-01")
  })

  it("requires confirm token for remote execute", () => {
    expect(() =>
      validateHistoricalPostingExecute(
        {
          execute: true,
          confirm: "WRONG",
          fromDateKey: DEFAULT_HISTORICAL_FROM,
          beforeDateKey: DEFAULT_HISTORICAL_BEFORE,
          csv: false,
        },
        "postgresql://user:secret@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
      )
    ).toThrow(HISTORICAL_POS_POSTING_CONFIRM_TOKEN)
  })

  it("classifies eligible sale with receipt for posting", () => {
    expect(
      classifyHistoricalSaleCandidate({
        saleId: "sale-1",
        total: "100",
        createdAt: new Date("2026-02-01T10:00:00+07:00"),
        receiptCount: 1,
        receiptNo: "REC-SH001-202602-0001",
        hasPayment: true,
        existingVoucher: null,
        periodStatus: AccountingPeriodStatus.OPEN,
      })
    ).toBeNull()
  })

  it("skips existing POS_SALE voucher", () => {
    expect(
      classifyHistoricalSaleCandidate({
        saleId: "sale-1",
        total: "100",
        createdAt: new Date("2026-02-01T10:00:00+07:00"),
        receiptCount: 1,
        receiptNo: "REC-SH001-202602-0001",
        hasPayment: true,
        existingVoucher: {
          refType: FINANCE_REF_TYPES.POS_SALE,
          refId: "sale-1",
          refNo: "REC-SH001-202602-0001",
          hasJournal: true,
        },
        periodStatus: AccountingPeriodStatus.OPEN,
      })
    ).toBe("ALREADY_POSTED")
  })

  it("skips missing receipt and multiple receipts", () => {
    expect(
      classifyHistoricalSaleCandidate({
        saleId: "sale-1",
        total: "100",
        createdAt: new Date("2026-02-01T10:00:00+07:00"),
        receiptCount: 0,
        hasPayment: true,
        existingVoucher: null,
        periodStatus: AccountingPeriodStatus.OPEN,
      })
    ).toBe("NO_RECEIPT")

    expect(
      classifyHistoricalSaleCandidate({
        saleId: "sale-2",
        total: "100",
        createdAt: new Date("2026-02-01T10:00:00+07:00"),
        receiptCount: 2,
        receiptNo: "REC-SH001-202602-0002",
        hasPayment: true,
        existingVoucher: null,
        periodStatus: AccountingPeriodStatus.OPEN,
      })
    ).toBe("MULTIPLE_RECEIPTS")
  })

  it("respects historical date range bounds", () => {
    expect(
      isInstantInHistoricalRange(
        new Date("2026-05-31T23:59:59.999+07:00"),
        range.from,
        range.before
      )
    ).toBe(true)
    expect(
      isInstantInHistoricalRange(
        new Date("2026-06-01T00:00:00+07:00"),
        range.from,
        range.before
      )
    ).toBe(false)
    expect(
      isInstantInHistoricalRange(
        new Date("2025-12-31T23:59:59.999+07:00"),
        range.from,
        range.before
      )
    ).toBe(false)
  })

  it("calculates VAT verification as gross × 7 / 107 with finance rounding", () => {
    const verification = vatVerificationFromGross("107.00")
    expect(verification.gross.toFixed(2)).toBe("107.00")
    expect(verification.calculatedNet.toFixed(2)).toBe("100.00")
    expect(verification.calculatedVat.toFixed(2)).toBe("7.00")
  })

  it("uses receipt.receiptNo as expected voucher refNo in eligible rows", () => {
    const row = makeEligibleRow({
      saleId: "sale-1",
      branchCode: "SH001",
      branchName: "Shop 1",
      receiptNo: "REC-SH001-202602-0042",
    })
    expect(row.sample.expectedVoucherRefNo).toBe("REC-SH001-202602-0042")
    expect(row.sample.calculatedNet).toBe("100.00")
    expect(row.sample.calculatedVat).toBe("7.00")
    expect(row.receiptNo).toBe("REC-SH001-202602-0042")
  })

  it("aggregates multiple shops and reconciles grand totals", () => {
    const eligibleRows = [
      makeEligibleRow({
        saleId: "sale-1",
        branchCode: "SH001",
        branchName: "Shop 1",
        receiptNo: "REC-SH001-202602-0001",
      }),
      makeEligibleRow({
        saleId: "sale-2",
        branchCode: "SH002",
        branchName: "Shop 2",
        receiptNo: "REC-SH002-202602-0001",
      }),
    ]
    const skipCounts = createEmptySkipCounts()
    incrementSkipCount(skipCounts, "ALREADY_POSTED")

    const aggregated = aggregateHistoricalPostingPlan({
      range,
      totalSales: 3,
      eligibleRows,
      skippedRows: [
        {
          saleId: "sale-3",
          branchCode: "SH001",
          branchName: "Shop 1",
          reason: "ALREADY_POSTED",
        },
      ],
      skipCounts,
    })

    expect(aggregated.shopSummaries).toHaveLength(2)
    expect(aggregated.grandSummary.eligibleCount).toBe(2)
    expect(aggregated.grandSummary.skippedCount).toBe(1)
    expect(aggregated.grandSummary.voucherCount).toBe(2)

    const shopGross = aggregated.shopSummaries.reduce(
      (sum, shop) => sum.plus(shop.grossTotal),
      new Prisma.Decimal(0)
    )
    expect(shopGross.toFixed(2)).toBe(
      aggregated.grandSummary.grossTotal.toFixed(2)
    )
    expect(aggregated.reconciliation.shopGrossSumEqualsGrandGross).toBe(true)
    expect(aggregated.reconciliation.shopVoucherCountEqualsGrandVoucherCount).toBe(
      true
    )
    expect(
      reconcileHistoricalPostingSummaries({
        shopSummaries: aggregated.shopSummaries,
        grandSummary: aggregated.grandSummary,
      }).checks.every((check) => check.pass)
    ).toBe(true)
  })

  it("builds CSV rows for eligible and skipped sales", () => {
    const eligible = makeEligibleRow({
      saleId: "sale-1",
      branchCode: "SH001",
      branchName: "Shop 1",
      receiptNo: "REC-SH001-202602-0001",
      total: "107",
    })
    const aggregated = aggregateHistoricalPostingPlan({
      range,
      totalSales: 2,
      eligibleRows: [eligible],
      skippedRows: [
        {
          saleId: "sale-2",
          branchCode: "SH001",
          branchName: "Shop 1",
          reason: "ALREADY_POSTED",
          receiptNo: "REC-SH001-202602-0002",
          saleDate: "2026-02-16",
          gross: "214.00",
        },
      ],
      skipCounts: (() => {
        const counts = createEmptySkipCounts()
        incrementSkipCount(counts, "ALREADY_POSTED")
        return counts
      })(),
    })

    const plan = {
      range,
      totalSales: 2,
      skipCounts: createEmptySkipCounts(),
      eligibleRows: [eligible],
      skippedRows: [
        {
          saleId: "sale-2",
          branchCode: "SH001",
          branchName: "Shop 1",
          reason: "ALREADY_POSTED" as const,
          receiptNo: "REC-SH001-202602-0002",
          saleDate: "2026-02-16",
          gross: "214.00",
        },
      ],
      csvRows: [],
      ...aggregated,
    }

    const csv = buildHistoricalPostingCsvContent([
      {
        branchCode: "SH001",
        receiptNo: "REC-SH001-202602-0001",
        saleDate: "2026-02-15",
        gross: "107.00",
        calculatedNet: "100.00",
        calculatedVat: "7.00",
        cogs: "0.00",
        tender: "107.00",
        status: "ELIGIBLE",
        skipReason: "",
      },
      {
        branchCode: "SH001",
        receiptNo: "REC-SH001-202602-0002",
        saleDate: "2026-02-16",
        gross: "214.00",
        calculatedNet: "200.00",
        calculatedVat: "14.00",
        cogs: "",
        tender: "",
        status: "SKIPPED",
        skipReason: "ALREADY_POSTED",
      },
    ])

    expect(historicalPostingCsvFilename(plan)).toBe(
      "historical-pos-posting-plan-2026-01.csv"
    )
    expect(csv).toContain("Branch,ReceiptNo,SaleDate,Gross,CalculatedNet,CalculatedVAT,COGS,Tender,Status,SkipReason")
    expect(csv).toContain("ELIGIBLE")
    expect(csv).toContain("ALREADY_POSTED")
  })

  it("plans branch-filtered sales and skips closed periods", async () => {
    const prisma = {
      accountingPeriod: {
        findMany: jest.fn().mockResolvedValue([
          { periodKey: "2026-02", status: AccountingPeriodStatus.OPEN },
          { periodKey: "2026-03", status: AccountingPeriodStatus.HARD_CLOSED },
        ]),
      },
      sale: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "sale-open",
            branchId: "branch-sh001",
            total: new Prisma.Decimal("107"),
            createdAt: new Date("2026-02-10T10:00:00+07:00"),
            netAmount: null,
            vatAmount: null,
            vatRateBps: null,
            taxCode: null,
            outputVatAccountCode: null,
            branch: { code: "SH001", name: "Shop 1" },
            receipt: { receiptNo: "REC-SH001-202602-0001" },
            payment: { method: PaymentMethod.CASH },
          },
          {
            id: "sale-closed",
            branchId: "branch-sh001",
            total: new Prisma.Decimal("214"),
            createdAt: new Date("2026-03-10T10:00:00+07:00"),
            netAmount: null,
            vatAmount: null,
            vatRateBps: null,
            taxCode: null,
            outputVatAccountCode: null,
            branch: { code: "SH001", name: "Shop 1" },
            receipt: { receiptNo: "REC-SH001-202603-0001" },
            payment: { method: PaymentMethod.CASH },
          },
        ]),
      },
      receipt: {
        groupBy: jest.fn().mockResolvedValue([
          { saleId: "sale-open", _count: { id: 1 } },
          { saleId: "sale-closed", _count: { id: 1 } },
        ]),
      },
      voucher: { findMany: jest.fn().mockResolvedValue([]) },
      stockTransaction: { findMany: jest.fn().mockResolvedValue([]) },
    }

    const plan = await planHistoricalPosSalePosting(prisma as never, {
      range,
      branchCode: "SH001",
    })

    expect(prisma.sale.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branch: { code: "SH001" },
        }),
      })
    )
    expect(plan.eligibleCount).toBe(1)
    expect(plan.skipCounts.PERIOD_CLOSED).toBe(1)
    expect(plan.eligibleRows[0]?.receiptNo).toBe("REC-SH001-202602-0001")
  })

  it("execute calls postSaleVoucher once per eligible sale and dry-run creates none", async () => {
    ;(postSaleVoucher as jest.Mock).mockResolvedValue({
      voucherId: "v-1",
      voucherNo: "V-1",
      journalEntryId: "j-1",
      alreadyPosted: false,
    })

    const row = makeEligibleRow({
      saleId: "sale-1",
      branchCode: "SH001",
      branchName: "Shop 1",
      receiptNo: "REC-SH001-202602-0001",
    })

    const plan = aggregateHistoricalPostingPlan({
      range,
      totalSales: 1,
      eligibleRows: [row],
      skippedRows: [],
      skipCounts: createEmptySkipCounts(),
    })

    const executePlan = {
      range,
      totalSales: 1,
      skipCounts: createEmptySkipCounts(),
      eligibleRows: [row],
      skippedRows: [],
      ...plan,
    }

    const dryRunCli = parseHistoricalPostingArgs([])
    expect(dryRunCli.execute).toBe(false)

    const prisma = {
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
    }

    const result = await executeHistoricalPosSalePosting(
      prisma as never,
      executePlan
    )

    expect(postSaleVoucher).toHaveBeenCalledTimes(1)
    expect(result.created).toBe(1)
    expect(result.failed).toHaveLength(0)
    expect((postSaleVoucher as jest.Mock).mock.calls[0][0].sale.receiptNo).toBe(
      "REC-SH001-202602-0001"
    )
  })

  it("re-running execute is idempotent via alreadyPosted result", async () => {
    ;(postSaleVoucher as jest.Mock).mockResolvedValue({
      voucherId: "v-1",
      voucherNo: "V-1",
      journalEntryId: "j-1",
      alreadyPosted: true,
    })

    const row = makeEligibleRow({
      saleId: "sale-1",
      branchCode: "SH001",
      branchName: "Shop 1",
      receiptNo: "REC-SH001-202602-0001",
    })

    const aggregated = aggregateHistoricalPostingPlan({
      range,
      totalSales: 1,
      eligibleRows: [row],
      skippedRows: [],
      skipCounts: createEmptySkipCounts(),
    })

    const plan = {
      range,
      totalSales: 1,
      skipCounts: createEmptySkipCounts(),
      eligibleRows: [row],
      skippedRows: [],
      ...aggregated,
    }

    const prisma = {
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
    }

    const result = await executeHistoricalPosSalePosting(
      prisma as never,
      plan
    )

    expect(result.created).toBe(0)
    expect(result.alreadyPosted).toBe(1)
    expect(postSaleVoucher).toHaveBeenCalledTimes(1)
  })
})
