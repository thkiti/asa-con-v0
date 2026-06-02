import { renderToStaticMarkup } from "react-dom/server"
import { StockDocumentStatusBadge } from "@/components/stock/StockDocumentStatusBadge"

describe("StockDocumentStatusBadge", () => {
  it("renders Draft label", () => {
    const html = renderToStaticMarkup(<StockDocumentStatusBadge status="DRAFT" />)
    expect(html).toContain("Draft")
    expect(html).toContain("bg-zinc-100")
  })

  it("renders Submitted label", () => {
    const html = renderToStaticMarkup(
      <StockDocumentStatusBadge status="SUBMITTED" />
    )
    expect(html).toContain("Submitted")
    expect(html).toContain("bg-blue-100")
  })

  it("renders Posted label", () => {
    const html = renderToStaticMarkup(<StockDocumentStatusBadge status="POSTED" />)
    expect(html).toContain("Posted")
    expect(html).toContain("bg-green-100")
  })
})
