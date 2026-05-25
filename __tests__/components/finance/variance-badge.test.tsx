import { renderToStaticMarkup } from "react-dom/server"
import { VarianceBadge } from "@/components/finance/VarianceBadge"

describe("VarianceBadge", () => {
  it("renders zero variance with green tone class", () => {
    const html = renderToStaticMarkup(<VarianceBadge variance="0" />)
    expect(html).toContain("0.00")
    expect(html).toContain("bg-green-100")
  })

  it("renders positive variance with amber tone class", () => {
    const html = renderToStaticMarkup(<VarianceBadge variance="5" />)
    expect(html).toContain("+")
    expect(html).toContain("bg-amber-100")
  })

  it("renders negative variance with red tone class", () => {
    const html = renderToStaticMarkup(<VarianceBadge variance="-5" />)
    expect(html).toContain("-")
    expect(html).toContain("bg-red-100")
  })
})
