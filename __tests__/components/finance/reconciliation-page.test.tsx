import { renderToStaticMarkup } from "react-dom/server"
import { ReconciliationPage } from "@/components/finance/ReconciliationPage"
import {
  fetchReconciliationDashboard,
  fetchReconciliationIssues,
} from "@/lib/finance-ui/fetchers"

jest.mock("@/lib/finance-ui/fetchers", () => ({
  fetchReconciliationDashboard: jest.fn(),
  fetchReconciliationIssues: jest.fn(),
}))

const mockFetchDashboard = fetchReconciliationDashboard as jest.MockedFunction<
  typeof fetchReconciliationDashboard
>
const mockFetchIssues = fetchReconciliationIssues as jest.MockedFunction<
  typeof fetchReconciliationIssues
>

describe("ReconciliationPage", () => {
  beforeEach(() => {
    mockFetchDashboard.mockReset()
    mockFetchIssues.mockReset()
  })

  it("renders filters and read-only guidance", () => {
    const html = renderToStaticMarkup(<ReconciliationPage />)
    expect(html).toContain("Filters")
    expect(html).toContain("Period key")
    expect(html).toContain("Variance status")
    expect(html).toContain("Export CSV")
    expect(html).toContain("Read-only view")
    expect(html).not.toContain("Fix")
    expect(html).not.toContain("Reconcile")
  })

  it("configures dashboard fetcher mock for apply flow", () => {
    mockFetchDashboard.mockResolvedValue({
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
      refunds: {
        filter: {},
        operationalRefundTotal: "25",
        glRefundRevenueTotal: "25",
        paymentBreakdown: [],
        variances: [],
      },
    })

    const html = renderToStaticMarkup(<ReconciliationPage />)
    expect(html).toContain("Apply")
    expect(mockFetchDashboard).not.toHaveBeenCalled()
    expect(mockFetchIssues).not.toHaveBeenCalled()
  })
})
