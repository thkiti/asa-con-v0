/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { SalesTargetCalendarPreview } from "@/components/shop/SalesTargetCalendarPreview"
import { splitMonthlyTargetToDaily } from "@/lib/shop/sales-targets"

const june2026Days = splitMonthlyTargetToDaily({
  monthlyTotal: "270000",
  weekPattern: [1, 1, 1, 1, 1, 1, 1],
  year: 2026,
  month: 6,
})

describe("SalesTargetCalendarPreview", () => {
  it("renders calendar weekday headers Sun–Sat in order", () => {
    const html = renderToStaticMarkup(
      <SalesTargetCalendarPreview
        year={2026}
        month={6}
        days={june2026Days}
        weekPattern={[1, 1, 1, 1, 1, 1, 1]}
        embedded
      />
    )
    const sunIdx = html.indexOf('data-testid="calendar-header-Sun"')
    const monIdx = html.indexOf('data-testid="calendar-header-Mon"')
    const satIdx = html.indexOf('data-testid="calendar-header-Sat"')
    expect(sunIdx).toBeGreaterThan(-1)
    expect(monIdx).toBeGreaterThan(sunIdx)
    expect(satIdx).toBeGreaterThan(monIdx)
    expect(html).not.toContain(">Date<")
    expect(html).not.toContain("<table")
  })

  it("renders formatted target amounts in calendar cells", () => {
    const html = renderToStaticMarkup(
      <SalesTargetCalendarPreview
        year={2026}
        month={6}
        days={june2026Days}
        weekPattern={[1, 1, 1, 1, 1, 1, 1]}
        embedded
      />
    )
    expect(html).toContain("9,000")
    expect(html).toContain("text-emerald-500")
    expect(html).not.toContain("Daily sum")
  })

  it("shows em dash for zero daily target", () => {
    const html = renderToStaticMarkup(
      <SalesTargetCalendarPreview
        year={2026}
        month={6}
        days={[{ dateKey: "2026-06-01", weekday: "Mon", target: "0.00" }]}
        weekPattern={[1, 1, 1, 1, 1, 1, 1]}
        embedded
      />
    )
    expect(html).toContain("—")
  })

  it("includes compact Sun–Sat week pattern footer only", () => {
    const html = renderToStaticMarkup(
      <SalesTargetCalendarPreview
        year={2026}
        month={6}
        days={june2026Days}
        weekPattern={[0.8, 0.9, 1, 1.1, 1, 0.9, 0.8]}
        embedded
      />
    )
    expect(html).toContain("Week pattern (Sun–Sat):")
    expect(html).toContain("Sum: 6.5")
    expect(html).not.toContain("Daily target = monthly target")
  })
})
