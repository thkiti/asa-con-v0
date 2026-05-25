import { Prisma } from "@/generated/prisma/client"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { assertBalanced, assertNonZeroLines } from "@/lib/finance/validation"

const d = (n: string) => new Prisma.Decimal(n)

describe("finance validation", () => {
  it("passes balanced lines", () => {
    expect(() =>
      assertBalanced([
        { glAccountId: "a", debit: d("100"), credit: d("0") },
        { glAccountId: "b", debit: d("0"), credit: d("100") },
      ])
    ).not.toThrow()
  })

  it("rejects unbalanced lines", () => {
    expect(() =>
      assertBalanced([
        { glAccountId: "a", debit: d("100"), credit: d("0") },
        { glAccountId: "b", debit: d("0"), credit: d("99") },
      ])
    ).toThrow(FinancePostingError)
  })

  it("rejects zero-only lines", () => {
    expect(() =>
      assertNonZeroLines([
        { glAccountId: "a", debit: d("0"), credit: d("0") },
        { glAccountId: "b", debit: d("0"), credit: d("0") },
      ])
    ).toThrow(FinancePostingError)
  })
})