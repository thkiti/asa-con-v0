import {
  buildDocumentLookupReadZDateOptions,
  buildDocumentLookupReadZDayOptions,
  buildReadZLookupDropdownDates,
  buildReadZYmdFromParts,
  clampReadZDayForMonth,
  enumerateBangkokYmdRangeDesc,
  parseReadZYmdParts,
  readZLookupDailyHasTicket,
  READ_Z_LOOKUP_EMPTY_MESSAGE,
  resolveDocumentLookupReadZSelectedDate,
} from "@/lib/pos-ui/read-z-lookup-display"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

const baseReport: ReadReportPayload = {
  mode: "Z",
  bangkokDate: "2026-06-27",
  readZScope: "daily",
  readZViewDate: "2026-06-27",
  generatedAt: "2026-06-27T10:00:00.000Z",
  staffId: "103",
  staffName: "Staff",
  branchCode: "SH001",
  branchName: "Chidlom",
  groupLines: [],
  paymentLines: [],
  grandTotal: 0,
  saleCount: 0,
  refundCount: 0,
  refundTotal: 0,
  netTotal: 0,
}

describe("read-z-lookup-display", () => {
  it("enumerates Bangkok dates newest first", () => {
    expect(enumerateBangkokYmdRangeDesc("2026-06-25", "2026-06-27")).toEqual([
      "2026-06-27",
      "2026-06-26",
      "2026-06-25",
    ])
  })

  it("builds month-to-date dropdown dates", () => {
    expect(buildReadZLookupDropdownDates("2026-06-27")[0]).toBe("2026-06-27")
    expect(buildReadZLookupDropdownDates("2026-06-27").at(-1)).toBe("2026-06-01")
  })

  it("detects empty daily ticket when no sales or refunds", () => {
    expect(readZLookupDailyHasTicket(baseReport)).toBe(false)
    expect(
      readZLookupDailyHasTicket({ ...baseReport, saleCount: 2 })
    ).toBe(true)
    expect(
      readZLookupDailyHasTicket({
        ...baseReport,
        readZScope: "cumulative-to-date",
        saleCount: 0,
      })
    ).toBe(true)
  })

  it("exposes Thai empty-state message", () => {
    expect(READ_Z_LOOKUP_EMPTY_MESSAGE).toContain("READ Z")
  })

  it("builds YMD from year/month/day parts", () => {
    expect(buildReadZYmdFromParts(2026, 6, 7)).toBe("2026-06-07")
  })

  it("builds document lookup day options newest first", () => {
    const options = buildDocumentLookupReadZDayOptions(2020, 1)
    expect(options.length).toBe(31)
    expect(options[0]).toBe(31)
    expect(options.at(-1)).toBe(1)
    expect(new Set(options).size).toBe(options.length)
  })

  it("clamps day when month changes", () => {
    expect(clampReadZDayForMonth(2026, 2, 31)).toBeLessThanOrEqual(29)
  })

  it("builds document lookup date options as YMD strings", () => {
    const options = buildDocumentLookupReadZDateOptions(2020, 1)
    expect(options[0]).toBe("2020-01-31")
    expect(options.at(-1)).toBe("2020-01-01")
    expect(options.length).toBe(31)
  })

  it("resolves selected date within month bounds", () => {
    expect(resolveDocumentLookupReadZSelectedDate(2020, 1, 31)).toBe("2020-01-31")
    expect(resolveDocumentLookupReadZSelectedDate(2020, 2, 31)).toBe("2020-02-29")
  })

  it("parses Bangkok YMD parts", () => {
    expect(parseReadZYmdParts("2026-06-27")).toEqual({
      year: 2026,
      month: 6,
      day: 27,
    })
    expect(parseReadZYmdParts("invalid")).toBeNull()
  })
})
