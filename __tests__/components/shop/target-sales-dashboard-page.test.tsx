/**
 * @jest-environment jsdom
 */
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { TargetSalesDashboardPage } from "@/components/shop/TargetSalesDashboardPage"
import {
  mainMenuLargePageTitleClass,
  mainMenuProfileClass,
  mainMenuShellContentClass,
} from "@/lib/main-ui/main-menu-layout"
import { fetchSalesDashboard } from "@/lib/shop-ui/sales-dashboard-client"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

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
    actualVat: "65.42",
    actualNet: "934.58",
    refunds: "100.00",
    netSales: "900.00",
    billCount: 42,
  },
  previousMonthWeekdayPatterns: ["0.00", "1.10", "1.00", "1.00", "1.00", "1.28", "0.00"],
  days: [
    {
      dateKey: "2026-06-05",
      target: null,
      actualGross: "100.00",
      actualVat: "6.54",
      actualNet: "93.46",
      lastMonthGross: "50.00",
    },
  ],
  hasAnyTarget: false,
}

const ytdView = {
  ...sampleView,
  yearToDate: true,
  monthSummary: {
    ...sampleView.monthSummary,
    grossSales: "5000.00",
    actualVat: "327.10",
    actualNet: "4672.90",
    netSales: "4900.00",
    billCount: 2244,
  },
}

function billCountText(container: HTMLElement): string {
  const box = container.querySelector(
    '[data-testid="dashboard-summary-bill-count"]'
  )
  return box?.textContent ?? ""
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

  it("renders month dropdown and year-to-date toggle in the filter row", () => {
    const html = renderToStaticMarkup(
      <TargetSalesDashboardPage user={hoAdmin} />
    )

    expect(html).toContain('data-testid="dashboard-month"')
    expect(html).toContain('data-testid="dashboard-ytd-toggle"')

    const scopeIndex = html.indexOf('data-testid="dashboard-scope"')
    const yearIndex = html.indexOf('data-testid="dashboard-year"')
    const monthIndex = html.indexOf('data-testid="dashboard-month"')
    const ytdIndex = html.indexOf('data-testid="dashboard-ytd-toggle"')
    const summaryIndex = html.indexOf('data-testid="dashboard-month-summary"')

    expect(scopeIndex).toBeGreaterThan(-1)
    expect(yearIndex).toBeGreaterThan(scopeIndex)
    expect(monthIndex).toBeGreaterThan(yearIndex)
    expect(ytdIndex).toBeGreaterThan(monthIndex)
    expect(summaryIndex).toBeGreaterThan(ytdIndex)
    expect(html).toContain("minmax(16rem,20rem)")
  })

  it("places header, filters, summary, and calendar in one full-width shell container", () => {
    const html = renderToStaticMarkup(
      <TargetSalesDashboardPage user={hoAdmin} />
    )

    expect(html).toContain(`data-testid="app-page-container"`)
    expect(html).toContain(mainMenuShellContentClass)
    expect(html).toContain(mainMenuProfileClass)

    const shellStart = html.indexOf('data-testid="app-page-container"')
    const userCardIndex = html.indexOf('data-testid="main-menu-user-card"')
    const filterIndex = html.indexOf('data-testid="dashboard-scope"')
    const summaryIndex = html.indexOf('data-testid="dashboard-month-summary"')

    expect(shellStart).toBeGreaterThan(-1)
    expect(userCardIndex).toBeGreaterThan(shellStart)
    expect(filterIndex).toBeGreaterThan(userCardIndex)
    expect(summaryIndex).toBeGreaterThan(filterIndex)
    expect(html).toContain('data-testid="target-sales-dashboard"')
  })

  it("keeps No. of Bill visible when switching monthly ↔ YEAR TO DATE", async () => {
    mockedFetch.mockImplementation(async (params) => {
      if (params.yearToDate) {
        return { ok: true, view: ytdView }
      }
      return { ok: true, view: sampleView }
    })

    const container = document.createElement("div")
    document.body.appendChild(container)
    let root: Root | null = createRoot(container)

    await act(async () => {
      root!.render(<TargetSalesDashboardPage user={hoAdmin} />)
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(billCountText(container)).toContain("42")

    const toggle = container.querySelector(
      '[data-testid="dashboard-ytd-toggle"]'
    ) as HTMLButtonElement
    expect(toggle).toBeTruthy()

    await act(async () => {
      toggle.click()
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(billCountText(container)).toContain("2,244")
    expect(billCountText(container)).not.toContain("2,244.00")

    await act(async () => {
      toggle.click()
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(billCountText(container)).toContain("42")

    act(() => {
      root!.unmount()
      root = null
    })
    container.remove()
  })
})
