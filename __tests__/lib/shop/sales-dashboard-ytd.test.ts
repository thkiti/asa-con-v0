import { Prisma } from "@/generated/prisma/client"
import {
  buildYtdCumulativeGrossMap,
  toComparablePreviousYearDateKey,
  ytdGrossThroughMonth,
} from "@/lib/shop/sales-dashboard-ytd"

function dec(value: string): Prisma.Decimal {
  return new Prisma.Decimal(value)
}

describe("sales-dashboard-ytd", () => {
  it("builds cumulative YTD through the selected month", () => {
    const grossByDay = new Map<string, Prisma.Decimal>([
      ["2026-01-10", dec("100")],
      ["2026-02-01", dec("50")],
      ["2026-02-02", dec("25")],
    ])

    const cumulative = buildYtdCumulativeGrossMap(2026, 2, grossByDay)

    expect(cumulative.get("2026-01-10")?.toFixed(2)).toBe("100.00")
    expect(cumulative.get("2026-01-31")?.toFixed(2)).toBe("100.00")
    expect(cumulative.get("2026-02-01")?.toFixed(2)).toBe("150.00")
    expect(cumulative.get("2026-02-02")?.toFixed(2)).toBe("175.00")
  })

  it("maps to the same month/day in the previous year", () => {
    expect(toComparablePreviousYearDateKey("2026-06-05")).toBe("2025-06-05")
    expect(toComparablePreviousYearDateKey("2024-02-29")).toBe("2023-02-28")
  })

  it("reads YTD gross through the last day of the selected month", () => {
    const grossByDay = new Map<string, Prisma.Decimal>([
      ["2026-01-10", dec("100")],
      ["2026-06-05", dec("30")],
    ])
    const cumulative = buildYtdCumulativeGrossMap(2026, 6, grossByDay)

    expect(ytdGrossThroughMonth(2026, 6, cumulative).toFixed(2)).toBe("130.00")
  })
})
