import { buildTargetActualCalendarGrid } from "@/lib/shop-ui/sales-dashboard-calendar"

describe("buildTargetActualCalendarGrid", () => {
  it("aligns June 2026 with Sunday-first leading pads", () => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = i + 1
      const dateKey = `2026-06-${String(d).padStart(2, "0")}`
      return { dateKey, target: "100.00", actualGross: "0.00", lastMonthGross: null }
    })

    const cells = buildTargetActualCalendarGrid({ year: 2026, month: 6, days })
    expect(cells[0]?.kind).toBe("empty")
    expect(cells.filter((c) => c.kind === "day")).toHaveLength(30)
    expect(cells.find((c) => c.kind === "day" && c.dateKey === "2026-06-01")).toBeTruthy()
  })

  it("preserves target and actual on day cells", () => {
    const cells = buildTargetActualCalendarGrid({
      year: 2026,
      month: 6,
      days: [{ dateKey: "2026-06-05", target: "500.00", actualGross: "150.00", lastMonthGross: "120.00" }],
    })
    const day = cells.find((c) => c.kind === "day" && c.dateKey === "2026-06-05")
    expect(day?.kind).toBe("day")
    if (day?.kind === "day") {
      expect(day.target).toBe("500.00")
      expect(day.actualGross).toBe("150.00")
      expect(day.lastMonthGross).toBe("120.00")
    }
  })
})
