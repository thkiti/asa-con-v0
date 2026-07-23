import { parseListQuery } from "@/app/api/stock-document/shared/parse-list-query"

describe("parseListQuery periodKey", () => {
  it("accepts periodKey=YYYY-MM from PeriodSelector", () => {
    const parsed = parseListQuery(
      "http://localhost/api/stock-document?periodKey=2026-01&limit=10"
    )
    expect(parsed.periodMonth).toBe("2026-01")
  })

  it("falls back to legacy periodMonth query param", () => {
    const parsed = parseListQuery(
      "http://localhost/api/stock-document?periodMonth=2026-03"
    )
    expect(parsed.periodMonth).toBe("2026-03")
  })

  it("prefers periodKey when both are present", () => {
    const parsed = parseListQuery(
      "http://localhost/api/stock-document?periodKey=2026-07&periodMonth=2026-01"
    )
    expect(parsed.periodMonth).toBe("2026-07")
  })
})
