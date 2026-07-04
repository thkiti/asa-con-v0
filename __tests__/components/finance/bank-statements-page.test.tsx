/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { BankStatementsPage } from "@/components/finance/bank-statements/BankStatementsPage"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/finance/bank-statements",
}))

jest.mock("@/lib/finance-ui/use-finance-legal-entity-scope", () => ({
  useFinanceLegalEntityScope: () => "AD",
  useFinanceEntityPathBuilder: () => (path: string) => `${path}?legalEntityCode=AD`,
}))

jest.mock("@/lib/finance-ui/use-finance-period-filter", () => ({
  useFinancePeriodFilter: () => ({
    periodKey: "2026-01",
    setPeriodKey: jest.fn(),
    periods: [
      {
        id: "p1",
        periodKey: "2026-01",
        legalEntityCode: "AD",
        branchId: "b1",
        branchName: "HQ",
        status: "OPEN",
        openedAt: "2026-01-01T00:00:00.000Z",
        closedAt: null,
      },
    ],
    loading: false,
    loadError: null,
    hasPeriods: true,
    emptyMessage: "No accounting period found for this entity.",
  }),
}))

jest.mock("@/lib/finance-ui/bank-accounts", () => ({
  fetchBankAccounts: jest.fn().mockResolvedValue({ items: [], total: 0 }),
}))

jest.mock("@/lib/finance-ui/bank-statements", () => ({
  fetchBankStatements: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  FINANCE_BANK_STATEMENTS_PAGE_PATH: "/finance/bank-statements",
  formatBankStatementAccountLabel: () => "BBL • 2193020266",
}))

describe("BankStatementsPage", () => {
  it("renders entity title and filters", () => {
    const html = renderToStaticMarkup(<BankStatementsPage />)
    expect(html).toContain('data-testid="entity-context-page-title"')
    expect(html).toContain("ASAD • BANK STATEMENTS")
    expect(html).toContain('data-testid="bank-statement-filter-period"')
    expect(html).toContain('data-testid="bank-statement-new"')
  })
})
