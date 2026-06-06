/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { CalendarPreviewGrid } from "@/components/shop-ui/CalendarPreviewGrid"

describe("CalendarPreviewGrid", () => {
  it("renders Sunday-first headers", () => {
    const html = renderToStaticMarkup(
      <CalendarPreviewGrid
        ariaLabel="June 2026"
        cells={[
          { kind: "day", key: "2026-06-01", day: 1, weekdaySun0: 1, value: "9000" },
        ]}
      />
    )
    const sunIdx = html.indexOf('data-testid="calendar-header-Sun"')
    const satIdx = html.indexOf('data-testid="calendar-header-Sat"')
    expect(sunIdx).toBeGreaterThan(-1)
    expect(satIdx).toBeGreaterThan(sunIdx)
  })

  it("formats values with financial commas", () => {
    const html = renderToStaticMarkup(
      <CalendarPreviewGrid
        ariaLabel="June 2026"
        cells={[
          {
            kind: "day",
            key: "2026-06-01",
            day: 1,
            weekdaySun0: 1,
            value: "12500.00",
          },
        ]}
      />
    )
    expect(html).toContain("12,500")
    expect(html).toContain("text-emerald-500")
  })

  it("shows em dash for zero values", () => {
    const html = renderToStaticMarkup(
      <CalendarPreviewGrid
        ariaLabel="June 2026"
        cells={[
          { kind: "day", key: "2026-06-01", day: 1, weekdaySun0: 1, value: "0" },
        ]}
      />
    )
    expect(html).toContain("—")
  })
})
