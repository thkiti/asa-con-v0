import { renderToStaticMarkup } from "react-dom/server"
import { ReconciliationPage } from "@/components/finance/ReconciliationPage"
import { fetchReconciliationDashboard } from "@/lib/finance-ui/fetchers"

jest.mock("@/lib/finance-ui/fetchers", () => ({
  fetchReconciliationDashboard: jest.fn(),
}))

const mockFetch = fetchReconciliationDashboard as jest.MockedFunction<
  typeof fetchReconciliationDashboard
>

describe("ReconciliationPage", () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it("renders filters and read-only guidance", () => {
    const html = renderToStaticMarkup(<ReconciliationPage />)
    expect(html).toContain("Filters")
    expect(html).toContain("Period key")
    expect(html).toContain("Variance status")
    expect(html).toContain("Export CSV")
    expect(html).toContain("Read-only view")
  })

  it("configures dashboard fetcher mock for apply flow", () => {
    mockFetch.mockResolvedValue({
      inventory: {
        filter: {},
        operationalTotalValue: "1000",
        glInventoryBalance: "995",
        variances: [],
      },
      sales: {
        filter: {},
        operationalRevenue: "500",
        glRevenueBalance: "500",
        paymentBreakdown: [],
        variances: [],
      },
    })

    const html = renderToStaticMarkup(<ReconciliationPage />)
    expect(html).toContain("Apply")
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
