import { DocType, PaymentMethod, Prisma } from "@/generated/prisma/client"
import {
  DEFAULT_ACCOUNT_CODES,
  resolveAccountsForPosRefund,
  resolveAccountsForPosSale,
  resolveAccountsForStockDocument,
} from "@/lib/finance/account-map"

describe("account-map", () => {
  it("maps POS_SALE cash tender deterministically", () => {
    const lines = resolveAccountsForPosSale({
      paymentMethod: PaymentMethod.CASH,
      total: "250",
      cogsAmount: "80",
    })
    expect(lines.map((l) => l.accountCode)).toEqual([
      DEFAULT_ACCOUNT_CODES.CASH,
      DEFAULT_ACCOUNT_CODES.REVENUE,
      DEFAULT_ACCOUNT_CODES.COGS,
      DEFAULT_ACCOUNT_CODES.INVENTORY,
    ])
    const debits = lines.reduce(
      (s, l) => s.plus(l.debit),
      new Prisma.Decimal(0)
    )
    const credits = lines.reduce(
      (s, l) => s.plus(l.credit),
      new Prisma.Decimal(0)
    )
    expect(debits.equals(credits)).toBe(true)
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

  it("uses card clearing for non-cash POS", () => {
    const lines = resolveAccountsForPosSale({
      paymentMethod: PaymentMethod.CARD,
      total: "10",
    })
    expect(lines[0]?.accountCode).toBe(DEFAULT_ACCOUNT_CODES.CARD_CLEARING)
  })

  it("maps POS_REFUND cash out with revenue reversal only", () => {
    const lines = resolveAccountsForPosRefund({
      paymentMethod: PaymentMethod.CASH,
      amount: "75",
    })
    expect(lines.map((l) => l.accountCode)).toEqual([
      DEFAULT_ACCOUNT_CODES.REVENUE,
      DEFAULT_ACCOUNT_CODES.CASH,
    ])
    expect(lines[0]?.debit.toNumber()).toBe(75)
    expect(lines[0]?.credit.toNumber()).toBe(0)
    expect(lines[1]?.debit.toNumber()).toBe(0)
    expect(lines[1]?.credit.toNumber()).toBe(75)
    const codes = lines.map((l) => l.accountCode)
    expect(codes).not.toContain(DEFAULT_ACCOUNT_CODES.COGS)
    expect(codes).not.toContain(DEFAULT_ACCOUNT_CODES.INVENTORY)
    const debits = lines.reduce(
      (s, l) => s.plus(l.debit),
      new Prisma.Decimal(0)
    )
    const credits = lines.reduce(
      (s, l) => s.plus(l.credit),
      new Prisma.Decimal(0)
    )
    expect(debits.equals(credits)).toBe(true)
  })

  it("uses card clearing for non-cash POS refund", () => {
    const lines = resolveAccountsForPosRefund({
      paymentMethod: PaymentMethod.CARD,
      amount: "25",
    })
    expect(lines[1]?.accountCode).toBe(DEFAULT_ACCOUNT_CODES.CARD_CLEARING)
  })
})