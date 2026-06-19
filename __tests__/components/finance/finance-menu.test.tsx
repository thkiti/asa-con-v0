/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { FinanceMenuHubView } from "@/components/finance/FinanceMenuHubView"
import { FinanceMenuView } from "@/components/finance/FinanceMenuView"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import {
  getAllFinanceMenuItems,
  getFinanceMenuHomeSections,
  getFinanceMenuHub,
} from "@/lib/main-ui/finance-menu"
import { mainMenuGridClass } from "@/lib/main-ui/main-menu-layout"

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}))

const hoFinance: SessionUserApi = {
  userId: "u1",
  staffId: "001",
  name: "Finance User",
  role: "HO_FINANCE",
  branchId: "b1",
  branchCode: "HO999",
  branchName: "Head Office",
  documentEntityCode: "AS",
}

describe("FinanceMenuView", () => {
  it("renders four F0 finance hub cards", () => {
    const html = renderToStaticMarkup(<FinanceMenuView user={hoFinance} />)
    expect(html).toContain('data-testid="main-menu-page"')
    expect(html).toContain(mainMenuGridClass)
    expect(html).toContain('href="/finance/dashboard"')
    expect(html).toContain('href="/finance/transactions"')
    expect(html).toContain('href="/finance/ledger"')
    expect(html).toContain('href="/finance/audit"')
    expect(html).toContain("Dashboard")
    expect(html).toContain("Transactions")
    expect(html).toContain("Ledger")
    expect(html).toContain("Audit")
    expect(html).not.toContain('href="/finance/daily-work"')
    expect(html).not.toContain('href="/finance/system"')
    expect(html).toContain('href="/main"')
    expect(html).toContain("w-[482px]")
    expect(html).toContain("h-[108px]")
  })
})

describe("FinanceMenuHubView", () => {
  it("renders transactions hub with MJV and PAY/REV coming soon groups", () => {
    const hub = getFinanceMenuHub("HO_FINANCE", "transactions")
    expect(hub).not.toBeNull()
    const html = renderToStaticMarkup(
      <FinanceMenuHubView user={hoFinance} hub={hub!} />
    )
    expect(html).toContain('data-testid="main-menu-grouped-grids"')
    expect(html).toContain('href="/finance"')
    expect(html).toContain('href="/finance/manual-journal-entries"')
    expect(html).toContain("MJV")
    expect(html).toContain("Payment Register")
    expect(html).toContain("Settlement")
    expect(html).toContain("Coming Soon")
    expect(html).not.toContain("Instant GL Journal")
    expect(html).not.toContain("Journal Entry Workflow")
    expect(html).toContain(mainMenuGridClass)
  })

  it("renders ledger hub with core reports only", () => {
    const hub = getFinanceMenuHub("HO_FINANCE", "ledger")
    const html = renderToStaticMarkup(
      <FinanceMenuHubView user={hoFinance} hub={hub!} />
    )
    expect(html).toContain('href="/finance/reports/trial-balance"')
    expect(html).toContain('href="/finance/reports/general-ledger"')
    expect(html).toContain('href="/finance/reports/profit-loss"')
    expect(html).toContain('href="/finance/reports/balance-sheet"')
    expect(html).toContain("Done")
    expect(html).not.toContain('href="/finance/reports/cash-flow"')
    expect(html).not.toContain("Retained Earnings")
  })

  it("renders audit hub with coming soon items", () => {
    const hub = getFinanceMenuHub("HO_FINANCE", "audit")
    const html = renderToStaticMarkup(
      <FinanceMenuHubView user={hoFinance} hub={hub!} />
    )
    expect(html).toContain("Voucher Lookup")
    expect(html).toContain("Document Trace")
    expect(html).toContain("Attachments")
    expect(html).toContain('aria-disabled="true"')
    expect(html).not.toContain('href="/finance/reconciliation"')
  })

  it("renders dashboard quick links to MJV and reports", () => {
    const hub = getFinanceMenuHub("HO_FINANCE", "dashboard")
    const html = renderToStaticMarkup(
      <FinanceMenuHubView user={hoFinance} hub={hub!} />
    )
    expect(html).toContain('href="/finance/manual-journal-entries"')
    expect(html).toContain('href="/finance/reports/trial-balance"')
  })

  it("maps legacy daily-work hub to transactions", () => {
    const hub = getFinanceMenuHub("HO_FINANCE", "daily-work")
    expect(hub?.key).toBe("transactions")
    expect(hub?.label).toBe("Transactions")
  })

  it("maps legacy reports hub to ledger", () => {
    const hub = getFinanceMenuHub("HO_FINANCE", "reports")
    expect(hub?.key).toBe("ledger")
  })

  it("renders legacy system hub links when requested directly", () => {
    const hub = getFinanceMenuHub("HO_FINANCE", "system")
    const html = renderToStaticMarkup(
      <FinanceMenuHubView user={hoFinance} hub={hub!} />
    )
    expect(html).toContain('href="/finance/accounts"')
    expect(html).toContain('href="/finance/accounts/import"')
    expect(html).toContain('href="/finance/periods"')
  })
})

describe("finance-menu config", () => {
  it("exposes F0 leaf items for diagnostics", () => {
    const keys = getAllFinanceMenuItems("HO_ADMIN").map((item) => item.key)
    expect(keys).toContain("mjv")
    expect(keys).toContain("trial-balance")
    expect(keys).toContain("pay-register")
    expect(keys).toContain("rev-settlement")
    expect(keys).toContain("voucher-lookup")
    expect(keys).not.toContain("manual-journal")
    expect(keys).not.toContain("opening-balance")
  })

  it("returns home sections for HO_FINANCE", () => {
    expect(getFinanceMenuHomeSections("HO_FINANCE")).toHaveLength(4)
    expect(getFinanceMenuHomeSections("HO_OPERATIONS")).toHaveLength(0)
  })
})
