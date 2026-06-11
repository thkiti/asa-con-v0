import { CLOSING_ENTRY_LINE_REASONS } from "@/lib/finance/closing-entry-types"
import { buildClosingEntryLines } from "@/lib/finance/closing-entry"
import { RETAINED_EARNINGS_ACCOUNT_CODE } from "@/lib/finance/reports/retained-earnings"

const RE = RETAINED_EARNINGS_ACCOUNT_CODE

function rev(code: string, signedAmount: string, name = `Revenue ${code}`) {
  return { accountCode: code, accountName: name, signedAmount }
}

function exp(code: string, signedAmount: string, name = `Expense ${code}`) {
  return { accountCode: code, accountName: name, signedAmount }
}

function lineAmounts(result: ReturnType<typeof buildClosingEntryLines>) {
  return result.lines.map((line) => ({
    accountCode: line.accountCode,
    debit: line.debit,
    credit: line.credit,
    reason: line.reason,
  }))
}

describe("buildClosingEntryLines", () => {
  it("profit scenario: revenue 1000, expense 600, RE credit 400, balanced", () => {
    const result = buildClosingEntryLines({
      periodKey: "2026-05",
      revenue: [rev("4000", "1000")],
      expenses: [exp("5000", "600")],
    })

    expect(result.isRequired).toBe(true)
    expect(result.isBalanced).toBe(true)
    expect(result.netIncome).toBe("400")
    expect(result.totalDebit).toBe("1000")
    expect(result.totalCredit).toBe("1000")
    expect(lineAmounts(result)).toEqual([
      {
        accountCode: "4000",
        debit: "1000",
        credit: "0",
        reason: CLOSING_ENTRY_LINE_REASONS.CLOSE_REVENUE,
      },
      {
        accountCode: "5000",
        debit: "0",
        credit: "600",
        reason: CLOSING_ENTRY_LINE_REASONS.CLOSE_EXPENSE,
      },
      {
        accountCode: RE,
        debit: "0",
        credit: "400",
        reason: CLOSING_ENTRY_LINE_REASONS.TRANSFER_NET_INCOME_TO_RE,
      },
    ])
  })

  it("loss scenario: revenue 500, expense 800, RE debit 300, balanced", () => {
    const result = buildClosingEntryLines({
      revenue: [rev("4000", "500")],
      expenses: [exp("5000", "800")],
    })

    expect(result.isRequired).toBe(true)
    expect(result.isBalanced).toBe(true)
    expect(result.netIncome).toBe("-300")
    expect(lineAmounts(result)).toEqual([
      {
        accountCode: "4000",
        debit: "500",
        credit: "0",
        reason: CLOSING_ENTRY_LINE_REASONS.CLOSE_REVENUE,
      },
      {
        accountCode: "5000",
        debit: "0",
        credit: "800",
        reason: CLOSING_ENTRY_LINE_REASONS.CLOSE_EXPENSE,
      },
      {
        accountCode: RE,
        debit: "300",
        credit: "0",
        reason: CLOSING_ENTRY_LINE_REASONS.TRANSFER_NET_LOSS_TO_RE,
      },
    ])
  })

  it("revenue only: RE credit 1000, balanced", () => {
    const result = buildClosingEntryLines({
      revenue: [rev("4000", "1000")],
      expenses: [],
    })

    expect(result.isRequired).toBe(true)
    expect(result.isBalanced).toBe(true)
    expect(result.netIncome).toBe("1000")
    expect(lineAmounts(result)).toEqual([
      {
        accountCode: "4000",
        debit: "1000",
        credit: "0",
        reason: CLOSING_ENTRY_LINE_REASONS.CLOSE_REVENUE,
      },
      {
        accountCode: RE,
        debit: "0",
        credit: "1000",
        reason: CLOSING_ENTRY_LINE_REASONS.TRANSFER_NET_INCOME_TO_RE,
      },
    ])
  })

  it("expense only: RE debit 1000, balanced", () => {
    const result = buildClosingEntryLines({
      revenue: [],
      expenses: [exp("5000", "1000")],
    })

    expect(result.isRequired).toBe(true)
    expect(result.isBalanced).toBe(true)
    expect(result.netIncome).toBe("-1000")
    expect(lineAmounts(result)).toEqual([
      {
        accountCode: "5000",
        debit: "0",
        credit: "1000",
        reason: CLOSING_ENTRY_LINE_REASONS.CLOSE_EXPENSE,
      },
      {
        accountCode: RE,
        debit: "1000",
        credit: "0",
        reason: CLOSING_ENTRY_LINE_REASONS.TRANSFER_NET_LOSS_TO_RE,
      },
    ])
  })

  it("no P&L activity: no lines, isRequired false", () => {
    const result = buildClosingEntryLines({
      periodKey: "2026-06",
      revenue: [rev("4000", "0")],
      expenses: [exp("5000", "0")],
    })

    expect(result.isRequired).toBe(false)
    expect(result.isBalanced).toBe(true)
    expect(result.lines).toEqual([])
    expect(result.totalDebit).toBe("0")
    expect(result.totalCredit).toBe("0")
    expect(result.netIncome).toBe("0")
  })

  it("abnormal revenue debit balance: credit revenue line", () => {
    const result = buildClosingEntryLines({
      revenue: [rev("4000", "-100")],
      expenses: [],
    })

    expect(result.isBalanced).toBe(true)
    expect(result.netIncome).toBe("-100")
    expect(lineAmounts(result)).toEqual([
      {
        accountCode: "4000",
        debit: "0",
        credit: "100",
        reason: CLOSING_ENTRY_LINE_REASONS.CLOSE_REVENUE,
      },
      {
        accountCode: RE,
        debit: "100",
        credit: "0",
        reason: CLOSING_ENTRY_LINE_REASONS.TRANSFER_NET_LOSS_TO_RE,
      },
    ])
  })

  it("abnormal expense credit balance: debit expense line", () => {
    const result = buildClosingEntryLines({
      revenue: [],
      expenses: [exp("6981", "-100", "Other admin expense")],
    })

    expect(result.isBalanced).toBe(true)
    expect(result.netIncome).toBe("100")
    expect(lineAmounts(result)).toEqual([
      {
        accountCode: "6981",
        debit: "100",
        credit: "0",
        reason: CLOSING_ENTRY_LINE_REASONS.CLOSE_EXPENSE,
      },
      {
        accountCode: RE,
        debit: "0",
        credit: "100",
        reason: CLOSING_ENTRY_LINE_REASONS.TRANSFER_NET_INCOME_TO_RE,
      },
    ])
  })

  it("rounding: small decimal values remain balanced after roundMoney", () => {
    const result = buildClosingEntryLines({
      revenue: [rev("5101", "1000.335")],
      expenses: [exp("6301", "333.335"), exp("6401", "333.335")],
    })

    expect(result.isBalanced).toBe(true)
    expect(result.netIncome).toBe("333.66")
    expect(result.totalDebit).toBe(result.totalCredit)
    expect(result.lines).toHaveLength(4)
  })

  it("multiple revenue and expense accounts: all lines included and balanced", () => {
    const result = buildClosingEntryLines({
      periodKey: "2026-05",
      revenue: [rev("5101", "700"), rev("5201", "300")],
      expenses: [exp("6301", "250"), exp("6401", "150")],
    })

    expect(result.isRequired).toBe(true)
    expect(result.isBalanced).toBe(true)
    expect(result.netIncome).toBe("600")
    expect(result.lines).toHaveLength(5)
    expect(result.lines.filter((l) => l.reason === CLOSING_ENTRY_LINE_REASONS.CLOSE_REVENUE)).toHaveLength(2)
    expect(result.lines.filter((l) => l.reason === CLOSING_ENTRY_LINE_REASONS.CLOSE_EXPENSE)).toHaveLength(2)
    expect(
      result.lines.find((l) => l.reason === CLOSING_ENTRY_LINE_REASONS.TRANSFER_NET_INCOME_TO_RE)
    ).toMatchObject({ accountCode: RE, debit: "0", credit: "600" })
    expect(result.totalDebit).toBe("1000")
    expect(result.totalCredit).toBe("1000")
  })
})
