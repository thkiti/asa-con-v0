import { renderToStaticMarkup } from "react-dom/server"
import { ReconciliationStatusBadge } from "@/components/finance/ReconciliationStatusBadge"

describe("ReconciliationStatusBadge", () => {
  it("renders MATCHED with green tone", () => {
    const html = renderToStaticMarkup(
      <ReconciliationStatusBadge status="MATCHED" />
    )
    expect(html).toContain("MATCHED")
    expect(html).toContain("bg-green-100")
  })

  it("renders VARIANCE with amber tone", () => {
    const html = renderToStaticMarkup(
      <ReconciliationStatusBadge status="VARIANCE" />
    )
    expect(html).toContain("VARIANCE")
    expect(html).toContain("bg-amber-100")
  })

  it("renders MISSING GL with red tone", () => {
    const html = renderToStaticMarkup(
      <ReconciliationStatusBadge status="MISSING_GL" />
    )
    expect(html).toContain("MISSING GL")
    expect(html).toContain("bg-red-100")
  })

  it("renders MISSING SOURCE with orange tone", () => {
    const html = renderToStaticMarkup(
      <ReconciliationStatusBadge status="MISSING_SOURCE" />
    )
    expect(html).toContain("MISSING SOURCE")
    expect(html).toContain("bg-orange-100")
  })
})
