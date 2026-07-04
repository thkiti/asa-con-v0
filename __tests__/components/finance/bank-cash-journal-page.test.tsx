/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { BankCashJournalPage } from "@/components/finance/BankCashJournalPage"

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("periodKey=2026-01"),
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/finance/bank-cash",
}))

jest.mock("@/lib/finance-ui/use-finance-legal-entity-scope", () => ({
  useFinanceLegalEntityScope: () => "AD",
  useFinanceEntityPathBuilder: () => (path: string) => `${path}?legalEntityCode=AD`,
}))

jest.mock("@/lib/finance-ui/use-bank-cash-check-period-filter", () => ({
  useBankCashCheckPeriodFilter: () => ({
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
    allPeriodsCompleted: false,
  }),
}))

jest.mock("@/lib/finance-ui/bank-cash-workspace", () => ({
  emptyQuickStatementLine: () => ({
    key: "new-1",
    depositAmount: "",
    withdrawalAmount: "",
    transactionDate: "",
    description: "",
    chequeNumber: "",
    showDetails: false,
  }),
  findOrCreateBankStatementWorkspace: jest.fn().mockResolvedValue(null),
  mapDetailToQuickLines: () => [],
  quickLinesToMatchLines: () => [],
  saveQuickStatementLines: jest.fn(),
}))

jest.mock("@/lib/finance-ui/bank-accounts", () => ({
  fetchBankAccounts: jest.fn().mockResolvedValue({ items: [], total: 0 }),
}))

jest.mock("@/lib/finance-ui/bank-cash-journal", () => ({
  fetchBankCashJournal: jest.fn().mockResolvedValue({ journal: null }),
}))

describe("BankCashJournalPage", () => {
  it("renders entity period title and filter controls", () => {
    const html = renderToStaticMarkup(<BankCashJournalPage />)
    expect(html).toContain('data-testid="entity-context-page-title"')
    expect(html).toContain("ASAD • BANK CASH CHECK • 2026-01")
    expect(html).toContain('data-testid="bank-cash-period-key"')
    expect(html).toContain('data-testid="bank-cash-bank-account"')
    expect(html).not.toContain('data-testid="bank-cash-apply"')
  })
})
