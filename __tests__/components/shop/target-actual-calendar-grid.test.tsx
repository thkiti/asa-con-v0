/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { TargetActualCalendarGrid } from "@/components/shop/TargetActualCalendarGrid"
import { buildTargetActualCalendarGrid } from "@/lib/shop-ui/sales-dashboard-calendar"

describe("TargetActualCalendarGrid", () => {
  it("renders Sunday-first headers and L/A lines without target labels", () => {
    const cells = buildTargetActualCalendarGrid({
      year: 2026,
      month: 6,
      days: [
        {
          dateKey: "2026-06-05",
          target: "500.00",
          actualGross: "150.00",
          lastMonthGross: "120.00",
        },
      ],
    })

    const html = renderToStaticMarkup(
      <TargetActualCalendarGrid cells={cells} onActualClick={() => {}} />
    )

    expect(html.indexOf('data-testid="target-actual-header-Sun"')).toBeGreaterThan(-1)
    expect(html).toContain('data-testid="last-month-line-2026-06-05"')
    expect(html).toContain('data-testid="actual-line-2026-06-05"')
    expect(html).toContain(">L<")
    expect(html).toContain(">A<")
    expect(html).toContain("120")
    expect(html).toContain("150")
    expect(html).not.toMatch(/>\s*T\s+\d/)
    expect(html).not.toContain(">T 500")
  })

  it("uses left label and right amount layout with dash for missing values", () => {
    const cells = buildTargetActualCalendarGrid({
      year: 2026,
      month: 6,
      days: [
        {
          dateKey: "2026-06-05",
          target: "500.00",
          actualGross: "150.00",
          lastMonthGross: null,
        },
        {
          dateKey: "2026-06-06",
          target: "500.00",
          actualGross: "0.00",
          lastMonthGross: "80.00",
        },
      ],
    })

    const html = renderToStaticMarkup(
      <TargetActualCalendarGrid cells={cells} onActualClick={() => {}} />
    )

    expect(html).toContain("justify-between")
    expect(html).toContain('data-testid="last-month-line-2026-06-05"')
    expect(html).toContain(">-<")
    expect(html).toContain('data-testid="last-month-line-2026-06-06"')
    expect(html).toContain("80")
  })

  it("renders actual line as button only when gross is positive", () => {
    const cells = buildTargetActualCalendarGrid({
      year: 2026,
      month: 6,
      days: [
        {
          dateKey: "2026-06-05",
          target: "500.00",
          actualGross: "150.00",
          lastMonthGross: "120.00",
        },
        {
          dateKey: "2026-06-06",
          target: "500.00",
          actualGross: "0.00",
          lastMonthGross: "80.00",
        },
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

  it("shows last-month comparable amount when data exists", () => {
    const cells = buildTargetActualCalendarGrid({
      year: 2026,
      month: 5,
      days: [
        {
          dateKey: "2026-05-01",
          target: null,
          actualGross: "250.00",
          lastMonthGross: "175.00",
        },
      ],
    })

    const html = renderToStaticMarkup(
      <TargetActualCalendarGrid cells={cells} onActualClick={() => {}} />
    )

    expect(html).toContain('data-testid="last-month-line-2026-05-01"')
    expect(html).toContain("175")
  })
})
