/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { FinanceMenuHubView } from "@/components/finance/FinanceMenuHubView"
import { FinanceMenuView } from "@/components/finance/FinanceMenuView"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import {
  canAccessFinanceMenu,
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
  it("renders three F0.2 finance hub cards", () => {
    const html = renderToStaticMarkup(<FinanceMenuView user={hoFinance} />)
    expect(html).toContain('data-testid="main-menu-page"')
    expect(html).toContain(mainMenuGridClass)
    expect(html).toContain('href="/finance/daily-work"')
    expect(html).toContain('href="/finance/dashboard"')
    expect(html).toContain('href="/finance/audit"')
    expect(html).toContain("Daily Work")
    expect(html).toContain("Dashboard")
    expect(html).toContain("Audit")
    expect(html).not.toContain("Transactions")
    expect(html).not.toContain("Ledger")
    expect(html).not.toContain('href="/finance/transactions"')
    expect(html).not.toContain('href="/finance/ledger"')
    expect(html).not.toContain('href="/finance/system"')
    expect(html).toContain('href="/main"')
    expect(html).toContain("w-[482px]")
    expect(html).toContain("h-[108px]")
  })
})

describe("FinanceMenuHubView", () => {
  it("renders daily work hub with MJV, PAV, INV, REV, and Petty Cash", () => {
    const hub = getFinanceMenuHub("HO_FINANCE", "daily-work")
    expect(hub).not.toBeNull()
    expect(hub?.label).toBe("Daily Work")
    const html = renderToStaticMarkup(
      <FinanceMenuHubView user={hoFinance} hub={hub!} />
    )
    expect(html).toContain('href="/finance"')
    expect(html).toContain('href="/finance/manual-journal-entries"')
    expect(html).toContain('href="/finance/payment-vouchers"')
    expect(html).toContain('href="/finance/invoice-vouchers"')
    expect(html).toContain("MJV")
    expect(html).toContain("PAV")
    expect(html).toContain("INV")
    expect(html).toContain("REV")
    expect(html).toContain("Petty Cash")
    expect(html).toContain(
      "Create and process finance documents — MJV, PAV, INV, REV, and PCV are live."
    )
    expect(html).toContain('href="/finance/revenue-vouchers"')
    expect(html).toContain('href="/finance/petty-cash-vouchers"')
    expect(html).toContain("Done")
    expect(html).not.toContain("Coming Soon")
    expect(html).not.toContain("Instant GL Journal")
    expect(html).not.toContain("Transactions")
    expect(html).not.toContain("Receivables")
    expect(html).not.toContain("APV")
    expect(html).not.toContain("ACC")
    expect(html).toContain(mainMenuGridClass)
  })

  it("renders dashboard hub with GL, TB, P&L, and BS", () => {
    const hub = getFinanceMenuHub("HO_FINANCE", "dashboard")
    const html = renderToStaticMarkup(
      <FinanceMenuHubView user={hoFinance} hub={hub!} />
    )
    expect(html).toContain('href="/finance/reports/trial-balance"')
    expect(html).toContain('href="/finance/reports/general-ledger"')
    expect(html).toContain('href="/finance/reports/profit-loss"')
    expect(html).toContain('href="/finance/reports/balance-sheet"')
    expect(html).toContain("Done")
    expect(html).not.toContain('href="/finance/ledger"')
    expect(html).not.toContain('href="/finance/reports/cash-flow"')
  })

  it("renders audit hub with finance document inquiry card", () => {
    const hub = getFinanceMenuHub("HO_FINANCE", "audit")
    const html = renderToStaticMarkup(
      <FinanceMenuHubView user={hoFinance} hub={hub!} />
    )
    expect(html).toContain("Finance Document Inquiry")
    expect(html).toContain(
      "Search, inspect, print and audit finance documents across vouchers and operational workflows."
    )
    expect(html).toContain('href="/finance/vouchers"')
    expect(html).toContain("Stock Document Inquiry")
    expect(html).toContain('href="/finance/stock-documents"')
    expect(html).toContain("Done")
    expect(html).toContain("Document Trace")
    expect(html).toContain("Attachments")
    expect(html).toContain('aria-disabled="true"')
    expect(html).not.toContain('href="/finance/reconciliation"')
    expect(html).not.toContain("Voucher / Journal Inquiry")
  })

  it("exposes finance document inquiry to HO_ADMIN only through finance menu gate", () => {
    const hub = getFinanceMenuHub("HO_ADMIN", "audit")
    expect(hub).not.toBeNull()
    const item = hub?.items.find((entry) => entry.key === "voucher-lookup")
    expect(item?.label).toBe("Finance Document Inquiry")
    expect(item?.href).toBe("/finance/vouchers")
    expect(getFinanceMenuHub("HO_OPERATIONS", "audit")).toBeNull()
    expect(getFinanceMenuHomeSections("HO_OPERATIONS")).toHaveLength(0)
  })

  it("maps legacy transactions hub to daily work", () => {
    const hub = getFinanceMenuHub("HO_FINANCE", "transactions")
    expect(hub?.key).toBe("daily-work")
    expect(hub?.label).toBe("Daily Work")
  })

  it("maps legacy ledger and reports hubs to dashboard", () => {
    expect(getFinanceMenuHub("HO_FINANCE", "ledger")?.key).toBe("dashboard")
    expect(getFinanceMenuHub("HO_FINANCE", "reports")?.key).toBe("dashboard")
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
  it("exposes F0.2 leaf items for diagnostics", () => {
    const items = getAllFinanceMenuItems("HO_ADMIN")
    const keys = items.map((item) => item.key)
    expect(keys).toContain("mjv")
    expect(keys).toContain("pav")
    const pav = items.find((item) => item.key === "pav")
    expect(pav?.status).toBe("available")
    expect(pav?.href).toBe("/finance/payment-vouchers")
    expect(keys).toContain("inv")
    const inv = items.find((item) => item.key === "inv")
    expect(inv?.status).toBe("available")
    expect(inv?.href).toBe("/finance/invoice-vouchers")
    expect(keys).toContain("rev")
    const rev = items.find((item) => item.key === "rev")
    expect(rev?.status).toBe("available")
    expect(rev?.href).toBe("/finance/revenue-vouchers")
    expect(keys).toContain("petty-cash")
    expect(keys).toContain("trial-balance")
    expect(keys).toContain("voucher-lookup")
    const voucherLookup = items.find((item) => item.key === "voucher-lookup")
    expect(voucherLookup?.status).toBe("available")
    expect(voucherLookup?.label).toBe("Finance Document Inquiry")
    expect(voucherLookup?.href).toBe("/finance/vouchers")
    expect(keys).toContain("stock-document-inquiry")
    const stockInquiry = items.find((item) => item.key === "stock-document-inquiry")
    expect(stockInquiry?.status).toBe("available")
    expect(stockInquiry?.href).toBe("/finance/stock-documents")
    expect(keys).not.toContain("pav-register")
    expect(keys).not.toContain("manual-journal")
  })

  it("returns home sections for HO_FINANCE", () => {
    expect(getFinanceMenuHomeSections("HO_FINANCE")).toHaveLength(3)
    expect(getFinanceMenuHomeSections("HO_OPERATIONS")).toHaveLength(0)
  })

  it("gates finance menu to HO_FINANCE and HO_ADMIN", () => {
    expect(canAccessFinanceMenu("HO_FINANCE")).toBe(true)
    expect(canAccessFinanceMenu("HO_ADMIN")).toBe(true)
    expect(canAccessFinanceMenu("HO_OPERATIONS")).toBe(false)
    expect(canAccessFinanceMenu("SH_STAFF")).toBe(false)
  })
})
