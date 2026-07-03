import {
  defaultManualJournalEntryListUiFilter,
  resolveManualJournalListDateRange,
  toManualJournalEntryListFilter,
} from "@/lib/finance-ui/manual-journal-entry-list-filter"

describe("manual-journal-entry-list-filter", () => {
  it("maps period key to month date range when advanced dates are empty", () => {
    expect(
      resolveManualJournalListDateRange({
        periodKey: "2026-06",
        dateFrom: "",
        dateTo: "",
      })
    ).toEqual({
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30",
    })
  })

  it("maps compact period key to month date range", () => {
    expect(
      resolveManualJournalListDateRange({
        periodKey: "202606",
        dateFrom: "",
        dateTo: "",
      })
    ).toEqual({
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30",
    })
  })

  it("prefers advanced from/to over period key", () => {
    expect(
      resolveManualJournalListDateRange({
        periodKey: "2026-06",
        dateFrom: "2026-06-10",
        dateTo: "2026-06-12",
      })
    ).toEqual({
      dateFrom: "2026-06-10",
      dateTo: "2026-06-12",
    })
  })

  it("omits legal entity from list filter payload", () => {
    expect(
      toManualJournalEntryListFilter({
        ...defaultManualJournalEntryListUiFilter(),
        status: "POSTED",
        entryNo: "MJV-260001",
        postingState: "all",
      })
    ).toEqual({
      status: "POSTED",
      entryNo: "MJV-260001",
      limit: 50,
      offset: 0,
    })
  })

  it("maps post filter to postingState when status is empty", () => {
    expect(
      toManualJournalEntryListFilter({
        ...defaultManualJournalEntryListUiFilter(),
        postingState: "unposted",
      })
    ).toMatchObject({ postingState: "unposted" })
  })
})
