import { renderToStaticMarkup } from "react-dom/server"
import { PeriodAdminPage } from "@/components/finance/PeriodAdminPage"

jest.mock("@/lib/finance-ui/period-fetchers", () => ({
  fetchAccountingPeriods: jest.fn().mockResolvedValue({
    periods: [
      {
        id: "period-1",
        periodKey: "2026-05",
        legalEntityCode: "AS",
        branchId: "branch-1",
        branchName: "Main Shop",
        status: "OPEN",
        openedAt: "2026-05-01T00:00:00.000Z",
        closedAt: null,
      },
    ],
  }),
  fetchSessionDisplay: jest.fn().mockResolvedValue({
    name: "Finance User",
    role: "HO_FINANCE",
  }),
  postAccountingPeriod: jest.fn(),
  patchAccountingPeriod: jest.fn(),
}))

describe("PeriodAdminPage", () => {
  it("renders filters without create form by default", () => {
    const html = renderToStaticMarkup(<PeriodAdminPage />)
    expect(html).not.toContain("Filters")
    expect(html).not.toContain(">Branch<")
    expect(html).toContain("Status")
    expect(html).toContain("Period")
    expect(html).not.toContain("Period key")
    expect(html).toContain("Refresh")
    expect(html).toContain("voucher-inquiry-filter-control")
    expect(html).toContain("Select status")
    expect(html).toContain("Select period")
    expect(html).not.toContain('value="ALL"')
    expect(html).not.toContain("Create / open period")
    expect(html).not.toContain("CREATE / OPEN PERIOD")
    expect(html).toContain("Loading periods")
  })

  it("shows manual create section when feature flag prop is enabled", () => {
    const html = renderToStaticMarkup(
      <PeriodAdminPage manualPeriodCreationEnabled />
    )
    expect(html).toContain("Create / open period (admin only)")
    expect(html).toContain("CREATE / OPEN PERIOD")
  })
})
