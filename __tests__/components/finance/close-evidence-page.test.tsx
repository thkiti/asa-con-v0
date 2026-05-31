import { renderToStaticMarkup } from "react-dom/server"
import { CloseEvidencePage } from "@/components/finance/CloseEvidencePage"

jest.mock("@/lib/finance-ui/period-fetchers", () => ({
  fetchCloseEvidence: jest.fn(() => new Promise(() => undefined)),
}))

describe("CloseEvidencePage", () => {
  it("renders loading state without mutation controls", () => {
    const html = renderToStaticMarkup(<CloseEvidencePage periodId="period-1" />)
    expect(html).toContain("Loading close evidence")
    expect(html).not.toContain("Refresh")
    expect(html).not.toContain("HARD CLOSE")
  })
})
