import { renderToStaticMarkup } from "react-dom/server"
import { PeriodStatusControl } from "@/components/finance/PeriodStatusControl"

jest.mock("@/lib/finance-ui/period-fetchers", () => ({
  patchPeriodStatus: jest.fn(),
}))

describe("PeriodStatusControl", () => {
  it("renders locked text for HARD_CLOSED periods", () => {
    const html = renderToStaticMarkup(
      <PeriodStatusControl
        periodId="period-1"
        currentStatus="HARD_CLOSED"
      />
    )
    expect(html).toContain("Locked")
    expect(html).not.toContain("Update status")
  })

  it("renders status controls for non-hard-closed periods", () => {
    const html = renderToStaticMarkup(
      <PeriodStatusControl
        periodId="period-1"
        currentStatus="OPEN"
      />
    )
    expect(html).toContain("Update status")
    expect(html).toContain("OPEN")
    expect(html).toContain("SOFT_CLOSED")
    expect(html).toContain("HARD_CLOSED")
    expect(html).not.toContain("Locked")
  })
})
