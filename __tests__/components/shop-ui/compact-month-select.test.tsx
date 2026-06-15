/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { CompactMonthSelect } from "@/components/shop-ui/CompactMonthSelect"

describe("CompactMonthSelect", () => {
  it("shows padded month in collapsed display and full labels in options", () => {
    const html = renderToStaticMarkup(
      <CompactMonthSelect value={5} onChange={() => {}} />
    )

    expect(html).toMatch(/data-testid="dashboard-month-display"[^>]*>05</)
    expect(html).toContain("05 • MAY")
    expect(html).toContain("06 • JUN")
    expect(html).toContain('value="5"')
  })

  it("uses compact header styling aligned with other controls", () => {
    const html = renderToStaticMarkup(
      <CompactMonthSelect value={6} onChange={() => {}} />
    )

    expect(html).toContain("h-9")
    expect(html).toContain("border-border")
    expect(html).toContain("text-transparent")
    expect(html).toContain('data-testid="dashboard-month-option-06"')
  })
})
