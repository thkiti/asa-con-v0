import { DocType, PaymentMethod, Prisma } from "@/generated/prisma/client"
import {
  DEFAULT_ACCOUNT_CODES,
  POS_CHECKOUT_FORBIDDEN_DEBIT_ACCOUNT_CODES,
  resolveAccountsForPosRefund,
  resolveAccountsForPosSale,
  resolveAccountsForStockDocument,
  resolveTenderAccountCodeForPosPayment,
} from "@/lib/finance/account-map"
import type { JournalLineCodeDraft } from "@/lib/finance/posting-types"
import {
  testVatEconomicsForGross,
  TEST_VAT_OUTPUT_STANDARD_POLICY,
} from "./helpers/pos-vat-fixtures"

const GROSS_VAT_EXAMPLE = "107"
const VAT_7 = testVatEconomicsForGross(GROSS_VAT_EXAMPLE)
const VAT_10 = testVatEconomicsForGross("110", 1000)

function lineByCode(lines: JournalLineCodeDraft[], code: string) {
  const line = lines.find((l) => l.accountCode === code)
  if (!line) {
    throw new Error(`Missing line for account ${code}`)
  }
  return line
}

function debitCodes(lines: JournalLineCodeDraft[]) {
  return lines.filter((l) => l.debit.gt(0)).map((l) => l.accountCode)
}

function assertBalanced(lines: JournalLineCodeDraft[]) {
  const debits = lines.reduce(
    (s, l) => s.plus(l.debit),
    new Prisma.Decimal(0)
  )
  const credits = lines.reduce(
    (s, l) => s.plus(l.credit),
    new Prisma.Decimal(0)
  )
  expect(debits.equals(credits)).toBe(true)
}

function assertNoForbiddenCheckoutDebits(lines: JournalLineCodeDraft[]) {
  for (const code of POS_CHECKOUT_FORBIDDEN_DEBIT_ACCOUNT_CODES) {
    const debitLine = lines.find((l) => l.accountCode === code && l.debit.gt(0))
    expect(debitLine).toBeUndefined()
  }
}

function assertStage1SaleEconomics(
  lines: JournalLineCodeDraft[],
  tenderCode: string,
  vatEconomics: ReturnType<typeof testVatEconomicsForGross>
) {
  expect(lineByCode(lines, tenderCode)).toMatchObject({
    debit: vatEconomics.gross,
    credit: new Prisma.Decimal(0),
  })
  expect(lineByCode(lines, DEFAULT_ACCOUNT_CODES.REVENUE)).toMatchObject({
    debit: new Prisma.Decimal(0),
    credit: vatEconomics.net,
  })
  expect(lineByCode(lines, vatEconomics.outputVatAccountCode)).toMatchObject({
    debit: new Prisma.Decimal(0),
    credit: vatEconomics.vat,
  })
  expect(debitCodes(lines)).toEqual([tenderCode])
  assertNoForbiddenCheckoutDebits(lines)
  assertBalanced(lines)
}

describe("account-map", () => {
  it("posts POS Sales Revenue to account 5001", () => {
    expect(DEFAULT_ACCOUNT_CODES.REVENUE).toBe("5001")
    const lines = resolveAccountsForPosSale({
      paymentMethod: PaymentMethod.CASH,
      total: GROSS_VAT_EXAMPLE,
      vatEconomics: VAT_7,
    })
    const revenueLine = lineByCode(lines, "5001")
    expect(revenueLine.credit).toEqual(VAT_7.net)
    expect(revenueLine.debit).toEqual(new Prisma.Decimal(0))
    expect(lines.some((l) => l.accountCode === "4000")).toBe(false)
  })

  it("maps CASH checkout to Stage 1 net revenue + output VAT", () => {
    const lines = resolveAccountsForPosSale({
      paymentMethod: PaymentMethod.CASH,
      total: GROSS_VAT_EXAMPLE,
      vatEconomics: VAT_7,
    })
    assertStage1SaleEconomics(lines, DEFAULT_ACCOUNT_CODES.CASH, VAT_7)
  })

  it("maps CARD checkout to Stage 1 net revenue + output VAT", () => {
    const lines = resolveAccountsForPosSale({
      paymentMethod: PaymentMethod.CARD,
      total: GROSS_VAT_EXAMPLE,
      vatEconomics: VAT_7,
    })
    assertStage1SaleEconomics(lines, DEFAULT_ACCOUNT_CODES.CARD_CLEARING, VAT_7)
  })

  it.each([
    PaymentMethod.QR,
    PaymentMethod.TRANSFER,
    PaymentMethod.BANK_TRANSFER,
  ])("maps %s checkout to bank transfer clearing", (paymentMethod) => {
    const lines = resolveAccountsForPosSale({
      paymentMethod,
      total: GROSS_VAT_EXAMPLE,
      vatEconomics: VAT_7,
    })
    assertStage1SaleEconomics(
      lines,
      DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING,
      VAT_7
    )
  })

  it("maps OTHER checkout to POS other clearing, not bank transfer clearing", () => {
    const lines = resolveAccountsForPosSale({
      paymentMethod: PaymentMethod.OTHER,
      total: GROSS_VAT_EXAMPLE,
      vatEconomics: VAT_7,
    })
    assertStage1SaleEconomics(
      lines,
      DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING,
      VAT_7
    )
    expect(debitCodes(lines)).not.toContain(DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING)
    assertNoForbiddenCheckoutDebits(lines)
  })

  it("uses policy outputVatAccountCode on checkout posting", () => {
    const customVat = testVatEconomicsForGross(GROSS_VAT_EXAMPLE, 700, "4699")
    const lines = resolveAccountsForPosSale({
      paymentMethod: PaymentMethod.CASH,
      total: GROSS_VAT_EXAMPLE,
      vatEconomics: customVat,
    })
    expect(lineByCode(lines, "4699").credit).toEqual(customVat.vat)
    expect(lines.some((l) => l.accountCode === DEFAULT_ACCOUNT_CODES.OUTPUT_VAT)).toBe(
      false
    )
  })

  it("supports future 10% VAT economics on gross 110", () => {
    const lines = resolveAccountsForPosSale({
      paymentMethod: PaymentMethod.CASH,
      total: "110",
      vatEconomics: VAT_10,
    })
    assertStage1SaleEconomics(lines, DEFAULT_ACCOUNT_CODES.CASH, VAT_10)
  })

  it("maps POS_SALE cash tender with COGS deterministically", () => {
    const vatEconomics = testVatEconomicsForGross("250")
    const lines = resolveAccountsForPosSale({
      paymentMethod: PaymentMethod.CASH,
      total: "250",
      cogsAmount: "80",
      vatEconomics,
    })
    expect(lines.map((l) => l.accountCode)).toEqual([
      DEFAULT_ACCOUNT_CODES.CASH,
      DEFAULT_ACCOUNT_CODES.REVENUE,
      TEST_VAT_OUTPUT_STANDARD_POLICY.outputVatAccountCode,
      DEFAULT_ACCOUNT_CODES.COGS,
      DEFAULT_ACCOUNT_CODES.INVENTORY,
    ])
    assertBalanced(lines)
    assertNoForbiddenCheckoutDebits(lines)
  })

  it("maps STOCK_DOC_POST PURCHASE deterministically", () => {
    const lines = resolveAccountsForStockDocument({
      docType: DocType.PURCHASE,
      inboundValue: "1000",
    })
    expect(lines).toEqual([
      expect.objectContaining({
        accountCode: DEFAULT_ACCOUNT_CODES.INVENTORY,
        debit: expect.any(Prisma.Decimal),
      }),
      expect.objectContaining({
        accountCode: DEFAULT_ACCOUNT_CODES.AP,
        credit: expect.any(Prisma.Decimal),
      }),
    ])
  })

  it("maps POS_REFUND cash out with net revenue and VAT reversal", () => {
    const lines = resolveAccountsForPosRefund({
      paymentMethod: PaymentMethod.CASH,
      amount: GROSS_VAT_EXAMPLE,
      vatEconomics: VAT_7,
    })
    expect(lines.map((l) => l.accountCode)).toEqual([
      DEFAULT_ACCOUNT_CODES.REVENUE,
      VAT_7.outputVatAccountCode,
      DEFAULT_ACCOUNT_CODES.CASH,
    ])
    expect(lineByCode(lines, DEFAULT_ACCOUNT_CODES.REVENUE)).toMatchObject({
      debit: VAT_7.net,
      credit: new Prisma.Decimal(0),
    })
    expect(lineByCode(lines, VAT_7.outputVatAccountCode)).toMatchObject({
      debit: VAT_7.vat,
      credit: new Prisma.Decimal(0),
    })
    expect(lineByCode(lines, DEFAULT_ACCOUNT_CODES.CASH)).toMatchObject({
      debit: new Prisma.Decimal(0),
      credit: VAT_7.gross,
    })
    const codes = lines.map((l) => l.accountCode)
    expect(codes).not.toContain(DEFAULT_ACCOUNT_CODES.COGS)
    expect(codes).not.toContain(DEFAULT_ACCOUNT_CODES.INVENTORY)
    assertBalanced(lines)
  })

  it("uses card clearing for non-cash POS refund", () => {
    const lines = resolveAccountsForPosRefund({
      paymentMethod: PaymentMethod.CARD,
      amount: "25",
      vatEconomics: testVatEconomicsForGross("25"),
    })
    expect(lines[2]?.accountCode).toBe(DEFAULT_ACCOUNT_CODES.CARD_CLEARING)
  })

  it("resolves tender account codes for Stage 1 map", () => {
    expect(resolveTenderAccountCodeForPosPayment(PaymentMethod.CASH)).toBe(
      DEFAULT_ACCOUNT_CODES.CASH
    )
    expect(resolveTenderAccountCodeForPosPayment(PaymentMethod.CARD)).toBe(
      DEFAULT_ACCOUNT_CODES.CARD_CLEARING
    )
    expect(resolveTenderAccountCodeForPosPayment(PaymentMethod.QR)).toBe(
      DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING
    )
    expect(resolveTenderAccountCodeForPosPayment(PaymentMethod.OTHER)).toBe(
      DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING
    )
  })
})
