/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { FinanceAccountOption } from "@/components/finance/FinanceAccountOption"
import { TrialBalancePage } from "@/components/finance/TrialBalancePage"
import { compareGlAccountCodes } from "@/lib/finance/gl-account-code-order"
import { filterAndSortGlAccountsForInquiry } from "@/lib/finance-ui/gl-account-inquiry-search"
import {
  buildPeriodKeyFromYearMonth,
  defaultTrialBalancePeriodParts,
  formatCompactMonthOptionLabel,
  TRIAL_BALANCE_MONTH_VALUES,
} from "@/lib/finance-ui/trial-balance-period"
import { financeNumber, financeThRight } from "@/lib/finance-ui/finance-visual-classes"
import fs from "fs"
import path from "path"
import type { GlAccountListRow } from "@/lib/finance/gl-account-list"
import { GlAccountType } from "@/generated/prisma/client"

jest.mock("@/lib/finance-ui/trial-balance", () => ({
  fetchTrialBalance: jest.fn(),
  downloadTrialBalanceCsv: jest.fn(),
}))

function stubAccount(code: string, name = code): GlAccountListRow {
  return {
    id: code,
    code,
    name,
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

describe("Trial Balance account code presentation", () => {
  it("left-aligns account codes via GL option class (and TB scoped fallback)", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8")
    expect(css).toMatch(/\.finance-account-option-code[\s\S]*text-align: left/)
    expect(css).toMatch(
      /\.trial-balance-report \.finance-account-option-code[\s\S]*text-align: left/
    )
    // Global voucher/MJV display remains right-aligned
    expect(css).toMatch(/^\.finance-account-code,[\s\S]*?text-align: right;/m)
  })

  it("renders GL Account dropdown option markup for Trial Balance rows", () => {
    const html = renderToStaticMarkup(
      <section className="trial-balance-report">
        <FinanceAccountOption code="1001" name="Cash" />
        <td className={financeNumber}>10.00</td>
        <th className={financeThRight}>Debit</th>
      </section>
    )
    expect(html).toContain('class="trial-balance-report"')
    expect(html).toContain('class="finance-account-option-code">1001</span>')
    expect(html).toContain("Cash")
    expect(html).toContain("finance-number")
    expect(html).toContain("numeric-cell")
    expect(html).toContain("numeric-th")
  })
})

describe("Trial Balance order matches GL Account dropdown", () => {
  it("uses the same comparator as filterAndSortGlAccountsForInquiry", () => {
    const codes = ["1021001", "101", "1", "1001", "1021", "1011", "1000"]
    const accounts = codes.map((code) => stubAccount(code))
    const glOrder = filterAndSortGlAccountsForInquiry(accounts, "").map((row) => row.code)
    const tbOrder = [...codes].sort(compareGlAccountCodes)
    expect(tbOrder).toEqual(glOrder)
    expect(tbOrder).toEqual([
      "1",
      "1000",
      "1001",
      "101",
      "1011",
      "1021",
      "1021001",
    ])
  })
})

describe("Trial Balance Year + Month period selector", () => {
  it("builds canonical periodKey from year and month", () => {
    expect(buildPeriodKeyFromYearMonth(2026, 7)).toBe("2026-07")
    expect(buildPeriodKeyFromYearMonth(2026, 1)).toBe("2026-01")
  })

  it("defaults to current calendar year/month", () => {
    const fixed = new Date(2026, 6, 16) // July 2026
    expect(defaultTrialBalancePeriodParts(fixed)).toEqual({
      year: 2026,
      month: 7,
      periodKey: "2026-07",
    })
  })

  it("changing Month maps to selected YYYY-MM for the Trial Balance query", () => {
    const year = 2026
    expect(buildPeriodKeyFromYearMonth(year, 3)).toBe("2026-03")
    expect(buildPeriodKeyFromYearMonth(year, 12)).toBe("2026-12")
  })

  it("changing Year maps to selected YYYY-MM for the Trial Balance query", () => {
    const month = 7
    expect(buildPeriodKeyFromYearMonth(2025, month)).toBe("2025-07")
    expect(buildPeriodKeyFromYearMonth(2027, month)).toBe("2027-07")
  })

  it("renders Year and Month dropdowns with compact month labels", () => {
    const html = renderToStaticMarkup(<TrialBalancePage />)
    expect(html).toContain('data-testid="trial-balance-year"')
    expect(html).toContain('data-testid="trial-balance-month"')
    expect(html).toContain(formatCompactMonthOptionLabel(1))
    expect(html).toContain(formatCompactMonthOptionLabel(7))
    expect(html).toContain("01 • JAN")
    expect(TRIAL_BALANCE_MONTH_VALUES).toHaveLength(12)
    expect(html).not.toContain("Period key")
  })

  it("preserves Trial Balance year window current ± 5 via PeriodSelector", () => {
    const html = renderToStaticMarkup(<TrialBalancePage />)
    const current = new Date().getFullYear()
    expect(html).toContain(`>${current - 5}</option>`)
    expect(html).toContain(`>${current + 5}</option>`)
    expect(html).not.toContain(`>${current - 6}</option>`)
    expect(html).not.toContain(`>${current + 6}</option>`)
  })
})
