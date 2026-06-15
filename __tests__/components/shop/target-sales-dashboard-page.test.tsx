/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { TargetSalesDashboardPage } from "@/components/shop/TargetSalesDashboardPage"
import {
  mainMenuLargePageTitleClass,
  mainMenuProfileClass,
  mainMenuShellContentClass,
} from "@/lib/main-ui/main-menu-layout"
import { fetchSalesDashboard } from "@/lib/shop-ui/sales-dashboard-client"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}))

jest.mock("@/lib/shop-ui/sales-dashboard-client", () => ({
  fetchSalesDashboard: jest.fn(),
}))

const mockedFetch = fetchSalesDashboard as jest.MockedFunction<
  typeof fetchSalesDashboard
>

const hoAdmin = {
  sessionId: "s1",
  userId: "u1",
  role: "HO_ADMIN" as const,
  staffId: "001",
  name: "Admin",
  branchId: "b1",
  branchCode: "HO999",
  branchName: "HO",
  documentEntityCode: "AS",
}

const sampleView = {
  scope: "company" as const,
  year: 2026,
  month: 6,
  branches: [{ id: "b1", code: "SH01", name: "Shop 1" }],
  monthSummary: {
    lastMonthSales: "800.00",
    grossSales: "1000.00",
    refunds: "100.00",
    netSales: "900.00",
    billCount: 42,
  },
  previousMonthWeekdayPatterns: ["0.00", "1.10", "1.00", "1.00", "1.00", "1.28", "0.00"],
  days: [{ dateKey: "2026-06-05", target: null, actualGross: "100.00", lastMonthGross: "50.00" }],
  hasAnyTarget: false,
}

describe("TargetSalesDashboardPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedFetch.mockResolvedValue({ ok: true, view: sampleView })
  })

  it("uses uppercase primary page title with larger heading class", () => {
    const html = renderToStaticMarkup(
      <TargetSalesDashboardPage user={hoAdmin} />
    )

    expect(html).toContain("LAST MONTH / ACTUAL SALES")
    expect(html).not.toContain("Target / Sales")
    expect(html).toContain(mainMenuLargePageTitleClass)
    expect(html).not.toContain("Target vs Sales")
  })

  it("renders month dropdown and year-to-date toggle", () => {
    const html = renderToStaticMarkup(
      <TargetSalesDashboardPage user={hoAdmin} />
    )

    expect(html).toContain('data-testid="dashboard-month"')
    expect(html).toContain('data-testid="dashboard-ytd-toggle"')
  })

  it("places header, filters, summary, and calendar in one full-width shell container", () => {
    const html = renderToStaticMarkup(
      <TargetSalesDashboardPage user={hoAdmin} />
    )

    expect(html).toContain(`data-testid="main-menu-shell-content"`)
    expect(html).toContain(mainMenuShellContentClass)
    expect(html).toContain(mainMenuProfileClass)

    const shellStart = html.indexOf('data-testid="main-menu-shell-content"')
    const userCardIndex = html.indexOf('data-testid="main-menu-user-card"')
    const filterIndex = html.indexOf('data-testid="dashboard-scope"')
    const summaryIndex = html.indexOf('data-testid="dashboard-month-summary"')

    expect(shellStart).toBeGreaterThan(-1)
    expect(userCardIndex).toBeGreaterThan(shellStart)
    expect(filterIndex).toBeGreaterThan(userCardIndex)
    expect(summaryIndex).toBeGreaterThan(filterIndex)
    expect(html).toContain('data-testid="target-sales-dashboard"')
  })
})
