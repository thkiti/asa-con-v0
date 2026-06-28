import { PaymentMethod } from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import { buildPosVatEconomics } from "@/lib/finance/pos-sale-vat"
import {
  buildPosRefundTenderReconciliationRows,
  buildPosTenderReconciliationRows,
  computePosSalesReconciliationMetrics,
  sumTenderClearingGlNet,
  tenderAccountCodeForPaymentMethod,
  tenderOperationalAmountForClearingAccount,
} from "@/lib/finance/pos-sales-reconciliation"
import { VAT_OUTPUT_STANDARD_TAX_CODE } from "@/lib/finance/tax-policy"

const POLICY_7 = {
  taxCode: VAT_OUTPUT_STANDARD_TAX_CODE,
  rateBps: 700,
  inclusive: true as const,
  outputVatAccountCode: DEFAULT_ACCOUNT_CODES.OUTPUT_VAT,
}

function economics(gross: string, rateBps = 700) {
  return buildPosVatEconomics(gross, {
    ...POLICY_7,
    rateBps,
  })
}

describe("computePosSalesReconciliationMetrics", () => {
  it("sale only 107 gross @ 7% CASH reconciles to zero variance", () => {
    const result = computePosSalesReconciliationMetrics({
      operationalGrossSales: "107.00",
      operationalGrossRefunds: "0.00",
      glNetRevenue: "100.00",
      glOutputVat: "7.00",
      operationalTenderIn: "107.00",
      operationalTenderRefundOut: "0.00",
      glTenderClearingNet: "107.00",
    })

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
    })
  })

  it("sale + full refund 107 gross @ 7% reconciles to zero variance", () => {
    const result = computePosSalesReconciliationMetrics({
      operationalGrossSales: "107.00",
      operationalGrossRefunds: "107.00",
      glNetRevenue: "0.00",
      glOutputVat: "0.00",
      operationalTenderIn: "107.00",
      operationalTenderRefundOut: "107.00",
      glTenderClearingNet: "0.00",
    })

    expect(result).toMatchObject({
      operationalNetGross: "0.00",
      glGrossEquivalent: "0.00",
      salesVariance: "0.00",
      operationalTenderNet: "0.00",
      tenderVariance: "0.00",
    })
  })

  it("110 gross @ 10% reconciles net 100 + VAT 10", () => {
    const split = economics("110", 1000)
    expect(split.net.toFixed(2)).toBe("100.00")
    expect(split.vat.toFixed(2)).toBe("10.00")

    const result = computePosSalesReconciliationMetrics({
      operationalGrossSales: "110.00",
      operationalGrossRefunds: "0.00",
      glNetRevenue: "100.00",
      glOutputVat: "10.00",
      operationalTenderIn: "110.00",
      operationalTenderRefundOut: "0.00",
      glTenderClearingNet: "110.00",
    })

    expect(result.glGrossEquivalent).toBe("110.00")
    expect(result.salesVariance).toBe("0.00")
  })
})

describe("buildPosTenderReconciliationRows", () => {
  it("maps tender methods to Stage 1 clearing accounts", () => {
    expect(tenderAccountCodeForPaymentMethod(PaymentMethod.CASH)).toBe(
      DEFAULT_ACCOUNT_CODES.CASH
    )
    expect(tenderAccountCodeForPaymentMethod(PaymentMethod.CARD)).toBe(
      DEFAULT_ACCOUNT_CODES.CARD_CLEARING
    )
    expect(tenderAccountCodeForPaymentMethod(PaymentMethod.QR)).toBe(
      DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING
    )
    expect(tenderAccountCodeForPaymentMethod(PaymentMethod.OTHER)).toBe(
      DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING
    )

    const rows = buildPosTenderReconciliationRows({
      salesBreakdown: [
        { method: PaymentMethod.CASH, amount: "10", saleCount: 1 },
        { method: PaymentMethod.CARD, amount: "20", saleCount: 1 },
        { method: PaymentMethod.QR, amount: "30", saleCount: 1 },
        { method: PaymentMethod.TRANSFER, amount: "5", saleCount: 1 },
        { method: PaymentMethod.BANK_TRANSFER, amount: "5", saleCount: 1 },
        { method: PaymentMethod.OTHER, amount: "7", saleCount: 1 },
      ],
      refundBreakdown: [
        { method: PaymentMethod.OTHER, amount: "2", saleCount: 1 },
      ],
      glAccounts: [
        { accountCode: DEFAULT_ACCOUNT_CODES.CASH, accountName: "Cash", accountType: "ASSET", debitTotal: "10", creditTotal: "0", balance: "10" },
        { accountCode: DEFAULT_ACCOUNT_CODES.CARD_CLEARING, accountName: "Card", accountType: "ASSET", debitTotal: "20", creditTotal: "0", balance: "20" },
        { accountCode: DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING, accountName: "Bank transfer", accountType: "ASSET", debitTotal: "40", creditTotal: "0", balance: "40" },
        { accountCode: DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING, accountName: "Other", accountType: "ASSET", debitTotal: "5", creditTotal: "0", balance: "5" },
      ],
    })

    expect(rows.find((row) => row.accountCode === DEFAULT_ACCOUNT_CODES.CASH)).toMatchObject({
      operationalAmount: "10.00",
      glAmount: "10",
      variance: "0.00",
    })
    expect(rows.find((row) => row.accountCode === DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING)).toMatchObject({
      operationalAmount: "40.00",
      variance: "0.00",
    })
    expect(rows.find((row) => row.accountCode === DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING)).toMatchObject({
      operationalAmount: "5.00",
      variance: "0.00",
    })
  })

  it("does not map OTHER to bank transfer clearing", () => {
    const rows = buildPosTenderReconciliationRows({
      salesBreakdown: [{ method: PaymentMethod.OTHER, amount: "50", saleCount: 1 }],
      refundBreakdown: [],
      glAccounts: [
        { accountCode: DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING, accountName: "Bank transfer", accountType: "ASSET", debitTotal: "0", creditTotal: "0", balance: "0" },
        { accountCode: DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING, accountName: "Other", accountType: "ASSET", debitTotal: "50", creditTotal: "0", balance: "50" },
      ],
    })

    expect(rows.find((row) => row.accountCode === DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING)?.operationalAmount).toBe("0.00")
    expect(rows.find((row) => row.accountCode === DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING)?.variance).toBe("0.00")
  })
})

describe("buildPosRefundTenderReconciliationRows", () => {
  it("maps refund tender methods to Stage 1 clearing GL credits", () => {
    expect(
      tenderOperationalAmountForClearingAccount(
        [{ method: PaymentMethod.QR, amount: "107", saleCount: 1 }],
        DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING
      )
    ).toBe("107")
    expect(
      tenderOperationalAmountForClearingAccount(
        [{ method: PaymentMethod.OTHER, amount: "107", saleCount: 1 }],
        DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING
      )
    ).toBe("107")
    expect(
      tenderOperationalAmountForClearingAccount(
        [{ method: PaymentMethod.OTHER, amount: "107", saleCount: 1 }],
        DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING
      )
    ).toBe("0")

    const rows = buildPosRefundTenderReconciliationRows({
      refundBreakdown: [
        { method: PaymentMethod.CASH, amount: "107", saleCount: 1 },
      ],
      glTenderCreditByAccountCode: {
        [DEFAULT_ACCOUNT_CODES.CASH]: "107",
        [DEFAULT_ACCOUNT_CODES.CARD_CLEARING]: "0",
        [DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING]: "0",
        [DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING]: "0",
      },
    })

    expect(rows.find((row) => row.accountCode === DEFAULT_ACCOUNT_CODES.CASH)).toMatchObject({
      operationalAmount: "107.00",
      glAmount: "107.00",
      variance: "0.00",
    })
  })

  it("reconciles CARD refund credits on card clearing", () => {
    const rows = buildPosRefundTenderReconciliationRows({
      refundBreakdown: [
        { method: PaymentMethod.CARD, amount: "107", saleCount: 1 },
      ],
      glTenderCreditByAccountCode: {
        [DEFAULT_ACCOUNT_CODES.CASH]: "0",
        [DEFAULT_ACCOUNT_CODES.CARD_CLEARING]: "107",
        [DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING]: "0",
        [DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING]: "0",
      },
    })

    expect(rows.find((row) => row.accountCode === DEFAULT_ACCOUNT_CODES.CARD_CLEARING)?.variance).toBe("0.00")
  })
})

describe("sumTenderClearingGlNet", () => {
  it("sums net debit across Stage 1 clearing accounts", () => {
    const total = sumTenderClearingGlNet([
      { accountCode: DEFAULT_ACCOUNT_CODES.CASH, accountName: "Cash", accountType: "ASSET", debitTotal: "107", creditTotal: "0", balance: "107" },
      { accountCode: DEFAULT_ACCOUNT_CODES.CARD_CLEARING, accountName: "Card", accountType: "ASSET", debitTotal: "0", creditTotal: "0", balance: "0" },
      { accountCode: DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING, accountName: "Transfer", accountType: "ASSET", debitTotal: "0", creditTotal: "0", balance: "0" },
      { accountCode: DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING, accountName: "Other", accountType: "ASSET", debitTotal: "0", creditTotal: "0", balance: "0" },
    ])
    expect(total).toBe("107.00")
  })
})

describe("P1 gross vs net revenue reconciliation", () => {
  it("flags variance when comparing gross sales to GL 4000 alone", () => {
    const grossOnly = computePosSalesReconciliationMetrics({
      operationalGrossSales: "107.00",
      operationalGrossRefunds: "0.00",
      glNetRevenue: "100.00",
      glOutputVat: "0.00",
      operationalTenderIn: "107.00",
      operationalTenderRefundOut: "0.00",
      glTenderClearingNet: "107.00",
    })
    expect(grossOnly.salesVariance).toBe("7.00")

    const grossEquivalent = computePosSalesReconciliationMetrics({
      operationalGrossSales: "107.00",
      operationalGrossRefunds: "0.00",
      glNetRevenue: "100.00",
      glOutputVat: "7.00",
      operationalTenderIn: "107.00",
      operationalTenderRefundOut: "0.00",
      glTenderClearingNet: "107.00",
    })
    expect(grossEquivalent.salesVariance).toBe("0.00")
  })
})
