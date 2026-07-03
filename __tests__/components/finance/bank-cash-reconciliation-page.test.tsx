/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { BankReconciliationPage } from "@/components/finance/BankReconciliationPage"
import { CashReconciliationPage } from "@/components/finance/CashReconciliationPage"
import { FINANCE_DASHBOARD_HREF } from "@/lib/main-ui/finance-page-layout"

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/finance/reconciliation/bank",
}))

jest.mock("@/lib/finance-ui/period-reconciliation-accounts", () => ({
  fetchReconciliationAccounts: jest.fn().mockResolvedValue({ items: [] }),
}))

jest.mock("@/lib/finance-ui/pos-settlement-branches", () => ({
  fetchPosSettlementBranches: jest.fn().mockResolvedValue({ items: [] }),
  formatPosSettlementBranchLabel: () => "Branch",
}))

jest.mock("@/lib/finance-ui/bank-reconciliation", () => ({
  fetchBankReconciliationList: jest.fn(),
  patchBankReconciliation: jest.fn(),
  saveBankReconciliationDraft: jest.fn(),
}))

jest.mock("@/lib/finance-ui/cash-reconciliation", () => ({
  fetchCashReconciliationList: jest.fn(),
  patchCashReconciliation: jest.fn(),
  saveCashReconciliationDraft: jest.fn(),
}))

describe("BankReconciliationPage", () => {
  it("renders shared filter bar and finance dashboard back link", () => {
    const html = renderToStaticMarkup(<BankReconciliationPage />)
    expect(html).toContain(`href="${FINANCE_DASHBOARD_HREF}"`)
    expect(html).toContain('data-testid="bank-reconciliation-filters"')
    expect(html).toContain('data-testid="bank-reconciliation-apply"')
    expect(html).toContain('data-testid="bank-reconciliation-more-filter"')
    expect(html).toContain("voucher-inquiry-filter-gl-account")
    expect(html).not.toContain('data-testid="bank-reconciliation-more-filter-panel"')
  })
})

describe("CashReconciliationPage", () => {
  it("renders branch and account filters with more filter toggle", () => {
    const html = renderToStaticMarkup(<CashReconciliationPage />)
    expect(html).toContain(`href="${FINANCE_DASHBOARD_HREF}"`)
    expect(html).toContain('data-testid="cash-reconciliation-filters"')
    expect(html).toContain('data-testid="cash-reconciliation-branch-select"')
    expect(html).toContain('data-testid="cash-reconciliation-account-select"')
    expect(html).toContain("voucher-inquiry-filter-branch-wide")
  })
})
