/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { TargetActualCalendarGrid } from "@/components/shop/TargetActualCalendarGrid"
import { buildTargetActualCalendarGrid } from "@/lib/shop-ui/sales-dashboard-calendar"

function day(
  dateKey: string,
  actualGross: string,
  lastMonthGross: string | null,
  actualVat = "0.00"
) {
  return {
    dateKey,
    target: "500.00" as string | null,
    actualGross,
    actualVat,
    actualNet: (Number(actualGross) - Number(actualVat)).toFixed(2),
    lastMonthGross,
  }
}

describe("TargetActualCalendarGrid", () => {
  it("renders Sunday-first headers and L/A/V money with two decimals", () => {
    const cells = buildTargetActualCalendarGrid({
      year: 2026,
      month: 6,
      days: [day("2026-06-05", "150.00", "120.00", "9.81")],
    })

    const html = renderToStaticMarkup(
      <TargetActualCalendarGrid
        cells={cells}
        weekdayPatterns={["1.52", "1.28", "1.10", "1.00", "1.00", "1.00", "0.95"]}
        onActualClick={() => {}}
      />
    )

    expect(html.indexOf('data-testid="target-actual-header-Sun"')).toBeGreaterThan(-1)
    expect(html).toContain('data-testid="target-actual-header-pattern-Sun"')
    expect(html).toContain("(1.52)")
    expect(html).toContain("(1.28)")
    expect(html).toContain('data-testid="last-month-line-2026-06-05"')
    expect(html).toContain('data-testid="actual-line-2026-06-05"')
    expect(html).toContain('data-testid="vat-line-2026-06-05"')
    expect(html).toContain(">L<")
    expect(html).toContain(">A<")
    expect(html).toContain(">V<")
    expect(html).toContain("120.00")
    expect(html).toContain("150.00")
    expect(html).toContain("9.81")
    expect(html).toContain("tabular-nums")
    expect(html).not.toMatch(/>\s*T\s+\d/)
    expect(html).not.toContain(">T 500")
  })

  it("shows 0.00 for zero money and dash only for missing last-month", () => {
    const cells = buildTargetActualCalendarGrid({
      year: 2026,
      month: 6,
      days: [
        day("2026-06-05", "150.00", null),
        day("2026-06-06", "0.00", "80.00"),
      ],
    })

    const html = renderToStaticMarkup(
      <TargetActualCalendarGrid cells={cells} onActualClick={() => {}} />
    )

    expect(html).toContain("justify-between")
    expect(html).toContain('data-testid="last-month-line-2026-06-05"')
    expect(html).toContain(">-<")
    expect(html).toContain('data-testid="last-month-line-2026-06-06"')
    expect(html).toContain("80.00")
    expect(html).toContain("0.00")
    expect(html).toContain("150.00")
  })

  it("renders actual line as button only when gross is positive", () => {
    const cells = buildTargetActualCalendarGrid({
      year: 2026,
      month: 6,
      days: [
        day("2026-06-05", "150.00", "120.00"),
        day("2026-06-06", "0.00", "80.00"),
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

  it("shows dash in weekday header when pattern is missing", () => {
    const cells = buildTargetActualCalendarGrid({
      year: 2026,
      month: 6,
      days: [],
    })

    const html = renderToStaticMarkup(
      <TargetActualCalendarGrid
        cells={cells}
        weekdayPatterns={[null, null, null, null, null, null, null]}
        onActualClick={() => {}}
      />
    )

    expect(html).toContain('data-testid="target-actual-header-pattern-Sun"')
    expect(html).toContain("(-)")
  })

  it("shows last-month comparable amount with two decimals", () => {
    const cells = buildTargetActualCalendarGrid({
      year: 2026,
      month: 5,
      days: [
        {
          dateKey: "2026-05-01",
          target: null,
          actualGross: "250.00",
          actualVat: "16.36",
          actualNet: "233.64",
          lastMonthGross: "175.00",
        },
      ],
    })

    const html = renderToStaticMarkup(
      <TargetActualCalendarGrid cells={cells} onActualClick={() => {}} />
    )

    expect(html).toContain('data-testid="last-month-line-2026-05-01"')
    expect(html).toContain("175.00")
    expect(html).toContain("250.00")
    expect(html).toContain("16.36")
  })
})
