import { renderToStaticMarkup } from "react-dom/server"
import { PeriodStatusBadge } from "@/components/finance/PeriodStatusBadge"

describe("PeriodStatusBadge", () => {
  it("renders OPEN with green tone class", () => {
    const html = renderToStaticMarkup(<PeriodStatusBadge status="OPEN" />)
    expect(html).toContain("Open")
    expect(html).toContain("bg-green-100")
  })

  it("renders SOFT_CLOSED with amber tone class", () => {
    const html = renderToStaticMarkup(
      <PeriodStatusBadge status="SOFT_CLOSED" />
    )
    expect(html).toContain("Soft closed")
    expect(html).toContain("bg-amber-100")
  })

  it("renders HARD_CLOSED with red tone class", () => {
    const html = renderToStaticMarkup(
      <PeriodStatusBadge status="HARD_CLOSED" />
    )
    expect(html).toContain("Hard closed")
    expect(html).toContain("bg-red-100")
  })
})
