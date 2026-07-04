/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { BankAccountsPage } from "@/components/finance/bank-accounts/BankAccountsPage"

jest.mock("@/lib/finance-ui/use-finance-legal-entity-scope", () => ({
  useFinanceLegalEntityScope: () => "AS",
}))

jest.mock("@/lib/finance-ui/bank-accounts", () => ({
  fetchBankAccounts: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  createBankAccount: jest.fn(),
  patchBankAccount: jest.fn(),
  deactivateBankAccount: jest.fn(),
  formatBankAccountGlLabel: () => "1021 • Bank",
}))

describe("BankAccountsPage", () => {
  it("renders master shell with entity title and add button", () => {
    const html = renderToStaticMarkup(<BankAccountsPage />)
    expect(html).toContain('data-testid="entity-context-page-title"')
    expect(html).toContain("BANK ACCOUNTS")
    expect(html).toContain('data-testid="bank-account-add"')
    expect(html).toContain('data-testid="bank-account-status-filter"')
    expect(html).toContain("← Finance")
  })
})
