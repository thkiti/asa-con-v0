import { renderToStaticMarkup } from "react-dom/server"
import { PeriodsAdminView } from "@/components/finance/PeriodsAdminView"

jest.mock("@/lib/finance-ui/period-fetchers", () => ({
  fetchAccountingPeriods: jest.fn().mockResolvedValue({ periods: [] }),
  fetchSessionDisplay: jest.fn().mockResolvedValue(null),
  patchPeriodStatus: jest.fn(),
}))

describe("PeriodsAdminView", () => {
  it("renders branch filter and refresh control without staff ID input", () => {
    const html = renderToStaticMarkup(<PeriodsAdminView />)
    expect(html).not.toContain("Staff ID")
    expect(html).toContain("Branch ID filter")
    expect(html).toContain("Loading periods")
  })
})
