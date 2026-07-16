import { compareGlAccountCodes } from "@/lib/finance/gl-account-code-order"
import { filterAndSortGlAccountsForInquiry } from "@/lib/finance-ui/gl-account-inquiry-search"
import type { GlAccountListRow } from "@/lib/finance/gl-account-list"
import { GlAccountType } from "@/generated/prisma/client"
import {
  buildPeriodKeyFromYearMonth,
  defaultTrialBalancePeriodParts,
  parsePeriodKeyYearMonth,
} from "@/lib/finance-ui/trial-balance-period"

function stubAccount(code: string): GlAccountListRow {
  return {
    id: code,
    code,
    name: code,
    accountType: GlAccountType.ASSET,
    parentId: null,
    parentCode: null,
    parentName: null,
    isActive: true,
    deleted: false,
    hasJournalLines: false,
    childCount: 0,
  }
}

describe("compareGlAccountCodes", () => {
  it("matches GL dropdown mixed-length order", () => {
    const codes = ["1021001", "101", "1", "1001", "1021", "1011", "1000"]
    expect([...codes].sort(compareGlAccountCodes)).toEqual([
      "1",
      "1000",
      "1001",
      "101",
      "1011",
      "1021",
      "1021001",
    ])
  })

  it("is the same comparator used by filterAndSortGlAccountsForInquiry", () => {
    const codes = ["5001", "1", "1000", "101", "1021001"]
    const fromHelper = [...codes].sort(compareGlAccountCodes)
    const fromInquiry = filterAndSortGlAccountsForInquiry(
      codes.map(stubAccount),
      ""
    ).map((row) => row.code)
    expect(fromHelper).toEqual(fromInquiry)
  })
})

describe("trial-balance-period", () => {
  it("builds and parses YYYY-MM", () => {
    expect(buildPeriodKeyFromYearMonth(2026, 7)).toBe("2026-07")
    expect(parsePeriodKeyYearMonth("2026-07")).toEqual({ year: 2026, month: 7 })
  })

  it("defaults to current calendar month", () => {
    expect(defaultTrialBalancePeriodParts(new Date(2026, 0, 5))).toEqual({
      year: 2026,
      month: 1,
      periodKey: "2026-01",
    })
  })
})
