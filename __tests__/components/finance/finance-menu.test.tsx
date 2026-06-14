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
  it("renders four finance hub cards with fixed main-menu grid", () => {
    const html = renderToStaticMarkup(<FinanceMenuView user={hoFinance} />)
    expect(html).toContain('data-testid="main-menu-page"')
    expect(html).toContain(mainMenuGridClass)
    expect(html).toContain('href="/finance/daily-work"')
    expect(html).toContain('href="/finance/reports"')
    expect(html).toContain('href="/finance/audit"')
    expect(html).toContain('href="/finance/system"')
    expect(html).toContain("Daily Work")
    expect(html).toContain("Reports")
    expect(html).toContain("Audit")
    expect(html).toContain("System")
    expect(html).toContain('href="/main"')
    expect(html).toContain("w-[482px]")
    expect(html).toContain("h-[108px]")
  })
})

describe("FinanceMenuHubView", () => {
  it("renders daily work links in main-menu layout", () => {
    const hub = getFinanceMenuHub("HO_FINANCE", "daily-work")
    expect(hub).not.toBeNull()
    const html = renderToStaticMarkup(
      <FinanceMenuHubView user={hoFinance} hub={hub!} />
    )
    expect(html).toContain('href="/finance"')
    expect(html).toContain('href="/finance/opening-balance"')
    expect(html).toContain("Journal Entry Workflow")
    expect(html).toContain("Instant GL Journal")
    expect(html).toContain(mainMenuGridClass)
  })

  it("renders reports hub links", () => {
    const hub = getFinanceMenuHub("HO_FINANCE", "reports")
    const html = renderToStaticMarkup(
      <FinanceMenuHubView user={hoFinance} hub={hub!} />
    )
    expect(html).toContain('href="/finance/reports/trial-balance"')
    expect(html).toContain('href="/finance/reports/general-ledger"')
    expect(html).toContain('href="/finance/reports/profit-loss"')
    expect(html).toContain('href="/finance/reports/balance-sheet"')
    expect(html).not.toContain('href="/finance/reports/cash-flow"')
  })

  it("renders audit hub with reconciliation workspace label", () => {
    const hub = getFinanceMenuHub("HO_FINANCE", "audit")
    const html = renderToStaticMarkup(
      <FinanceMenuHubView user={hoFinance} hub={hub!} />
    )
    expect(html).toContain("Reconciliation Workspace")
    expect(html).toContain('href="/finance/reconciliation"')
    expect(html).toContain('href="/finance/reconciliation/snapshots"')
  })

  it("renders system hub links", () => {
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
  it("exposes leaf items for diagnostics", () => {
    const keys = getAllFinanceMenuItems("HO_ADMIN").map((item) => item.key)
    expect(keys).toContain("opening-balance")
    expect(keys).toContain("trial-balance")
    expect(keys).toContain("accounting-periods")
  })

  it("returns home sections for HO_FINANCE", () => {
    expect(getFinanceMenuHomeSections("HO_FINANCE")).toHaveLength(4)
    expect(getFinanceMenuHomeSections("HO_OPERATIONS")).toHaveLength(0)
  })
})
