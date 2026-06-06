/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { TargetActualCalendarGrid } from "@/components/shop/TargetActualCalendarGrid"
import { buildTargetActualCalendarGrid } from "@/lib/shop-ui/sales-dashboard-calendar"

describe("TargetActualCalendarGrid", () => {
  it("renders Sunday-first headers and T/A lines", () => {
    const cells = buildTargetActualCalendarGrid({
      year: 2026,
      month: 6,
      days: [{ dateKey: "2026-06-05", target: "500.00", actualGross: "150.00" }],
    })

    const html = renderToStaticMarkup(
      <TargetActualCalendarGrid cells={cells} onActualClick={() => {}} />
    )

    expect(html.indexOf('data-testid="target-actual-header-Sun"')).toBeGreaterThan(-1)
    expect(html).toContain('data-testid="target-line-2026-06-05"')
    expect(html).toContain("T 500")
    expect(html).toContain("A 150")
  })

  it("renders actual line as button only when gross is positive", () => {
    const cells = buildTargetActualCalendarGrid({
      year: 2026,
      month: 6,
      days: [
        { dateKey: "2026-06-05", target: "500.00", actualGross: "150.00" },
        { dateKey: "2026-06-06", target: "500.00", actualGross: "0.00" },
      ],
    })

    const html = renderToStaticMarkup(
      <TargetActualCalendarGrid cells={cells} onActualClick={() => {}} />
    )

    expect(html).toContain('data-testid="actual-line-2026-06-05"')
    expect(html).toContain('<button type="button"')
    expect(html).toMatch(/data-testid="actual-line-2026-06-05"/)
    expect(html).not.toMatch(/data-testid="actual-line-2026-06-06"[\s\S]*?<button/)
  })
})
