import {
  buildTargetActualCalendarGrid,
  TARGET_ACTUAL_DASHBOARD_HEADER_GRID,
} from "@/lib/shop-ui/sales-dashboard-calendar"

function dayRow(
  dateKey: string,
  partial: Partial<{
    target: string | null
    actualGross: string
    actualVat: string
    actualNet: string
    lastMonthGross: string | null
  }> = {}
) {
  const actualGross = partial.actualGross ?? "0.00"
  const actualVat = partial.actualVat ?? "0.00"
  return {
    dateKey,
    target: partial.target ?? "100.00",
    actualGross,
    actualVat,
    actualNet:
      partial.actualNet ??
      (Number(actualGross) - Number(actualVat)).toFixed(2),
    lastMonthGross:
      partial.lastMonthGross === undefined ? null : partial.lastMonthGross,
  }
}

describe("TARGET_ACTUAL_DASHBOARD_HEADER_GRID", () => {
  it("caps shop width and reserves a trailing YTD column", () => {
    expect(TARGET_ACTUAL_DASHBOARD_HEADER_GRID).toContain("minmax(16rem,20rem)")
    expect(TARGET_ACTUAL_DASHBOARD_HEADER_GRID).toContain("4.25rem")
    expect(TARGET_ACTUAL_DASHBOARD_HEADER_GRID).toContain("3rem")
    expect(TARGET_ACTUAL_DASHBOARD_HEADER_GRID).toContain("_auto]")
    expect(TARGET_ACTUAL_DASHBOARD_HEADER_GRID).not.toContain("minmax(0,1fr)_4.25rem")
  })
})

describe("buildTargetActualCalendarGrid", () => {
  it("aligns June 2026 with Sunday-first leading pads", () => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = i + 1
      const dateKey = `2026-06-${String(d).padStart(2, "0")}`
      return dayRow(dateKey)
    })

    const cells = buildTargetActualCalendarGrid({ year: 2026, month: 6, days })
    expect(cells[0]?.kind).toBe("empty")
    expect(cells.filter((c) => c.kind === "day")).toHaveLength(30)
    expect(
      cells.find((c) => c.kind === "day" && c.dateKey === "2026-06-01")
    ).toBeTruthy()
  })

  it("preserves target, actual, and VAT on day cells", () => {
    const cells = buildTargetActualCalendarGrid({
      year: 2026,
      month: 6,
      days: [
        dayRow("2026-06-05", {
          target: "500.00",
          actualGross: "150.00",
          actualVat: "9.81",
          lastMonthGross: "120.00",
        }),
      ],
    })
    const day = cells.find((c) => c.kind === "day" && c.dateKey === "2026-06-05")
    expect(day?.kind).toBe("day")
    if (day?.kind === "day") {
      expect(day.target).toBe("500.00")
      expect(day.actualGross).toBe("150.00")
      expect(day.actualVat).toBe("9.81")
      expect(day.actualNet).toBe("140.19")
      expect(day.lastMonthGross).toBe("120.00")
    }
  })
})
