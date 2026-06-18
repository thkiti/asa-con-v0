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
  it("renders filters, create form, and loading state markup", () => {
    const html = renderToStaticMarkup(<PeriodAdminPage />)
    expect(html).toContain("Filters")
    expect(html).not.toContain(">Branch<")
    expect(html).toContain("Status")
    expect(html).toContain("Period key")
    expect(html).toContain("Refresh")
    expect(html).toContain("Create / open period")
    expect(html).toContain("CREATE / OPEN PERIOD")
    expect(html).toContain("Loading periods")
  })
})
