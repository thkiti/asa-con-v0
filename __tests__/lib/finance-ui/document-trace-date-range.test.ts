import {
  buildDocumentTraceCommittedDatePatch,
  documentTracePeriodToIsoRange,
  formatDocumentTraceDisplayDate,
  parseDocumentTraceDisplayDate,
  resolveDocumentTraceDateDrafts,
} from "@/lib/finance-ui/document-trace-date-range"

describe("documentTracePeriodToIsoRange", () => {
  it("returns first and last day for a valid period", () => {
    expect(documentTracePeriodToIsoRange("2026-01")).toEqual({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    })
  })
})

describe("document trace display dates", () => {
  it("formats and parses dd/mm/yyyy", () => {
    expect(formatDocumentTraceDisplayDate("2026-01-10")).toBe("10/01/2026")
    expect(parseDocumentTraceDisplayDate("10/01/2026")).toBe("2026-01-10")
    expect(parseDocumentTraceDisplayDate("10.01.2026")).toBe("2026-01-10")
  })

  it("keeps month and year when only the day changes in display text", () => {
    expect(parseDocumentTraceDisplayDate("10/01/2026")).toBe("2026-01-10")
    expect(parseDocumentTraceDisplayDate("01/01/2026")).toBe("2026-01-01")
  })
})

describe("resolveDocumentTraceDateDrafts", () => {
  it("prefills period bounds when committed dates are empty", () => {
    expect(
      resolveDocumentTraceDateDrafts({
        period: "2026-01",
        dateFrom: "",
        dateTo: "",
      })
    ).toEqual({
      dateFrom: "01/01/2026",
      dateTo: "31/01/2026",
    })
  })

  it("uses committed dates when present", () => {
    expect(
      resolveDocumentTraceDateDrafts({
        period: "2026-01",
        dateFrom: "2026-01-10",
        dateTo: "2026-01-20",
      })
    ).toEqual({
      dateFrom: "10/01/2026",
      dateTo: "20/01/2026",
    })
  })
})

describe("buildDocumentTraceCommittedDatePatch", () => {
  it("returns empty committed dates when drafts match the period", () => {
    expect(
      buildDocumentTraceCommittedDatePatch({
        period: "2026-01",
        dateFromDisplay: "01/01/2026",
        dateToDisplay: "31/01/2026",
      })
    ).toEqual({
      dateFrom: "",
      dateTo: "",
    })
  })

  it("commits only the edited side of the range", () => {
    expect(
      buildDocumentTraceCommittedDatePatch({
        period: "2026-01",
        dateFromDisplay: "10/01/2026",
        dateToDisplay: "31/01/2026",
      })
    ).toEqual({
      dateFrom: "2026-01-10",
      dateTo: "",
    })
  })
})
