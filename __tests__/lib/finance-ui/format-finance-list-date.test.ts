import { formatFinanceListDate } from "@/lib/finance-ui/format"

describe("formatFinanceListDate", () => {
  it("formats ISO timestamps as DD/MM/YYYY", () => {
    expect(formatFinanceListDate("2026-06-14T00:00:00.000Z")).toBe("14/06/2026")
    expect(formatFinanceListDate("2026-06-29T12:00:00.000Z")).toBe("29/06/2026")
  })

  it("formats date-only ISO strings as DD/MM/YYYY", () => {
    expect(formatFinanceListDate("2026-01-01")).toBe("01/01/2026")
  })

  it("returns em dash for empty values", () => {
    expect(formatFinanceListDate(null)).toBe("—")
    expect(formatFinanceListDate("")).toBe("—")
  })
})
