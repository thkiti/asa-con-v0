import {
  buildFinanceDocumentAuditLine,
  formatFinanceDocumentDate,
} from "@/lib/finance-ui/finance-document-display"

describe("formatFinanceDocumentDate", () => {
  it("formats ISO date-only strings as DD.MM.YYYY", () => {
    expect(formatFinanceDocumentDate("2026-01-01")).toBe("01.01.2026")
    expect(formatFinanceDocumentDate("2026-06-16")).toBe("16.06.2026")
  })

  it("formats ISO timestamps using the calendar date", () => {
    expect(formatFinanceDocumentDate("2026-06-14T12:00:00.000Z")).toBe("14.06.2026")
  })

  it("returns em dash for empty values", () => {
    expect(formatFinanceDocumentDate(null)).toBe("—")
    expect(formatFinanceDocumentDate("")).toBe("—")
  })
})

describe("buildFinanceDocumentAuditLine", () => {
  it("joins document metadata with bullet separators", () => {
    expect(
      buildFinanceDocumentAuditLine({
        documentNo: "OPB-260003",
        entryDate: "2026-01-01",
        createdAt: "2026-06-16T08:00:00.000Z",
        submittedAt: "2026-06-16T09:00:00.000Z",
        confirmedAt: "2026-06-16T10:00:00.000Z",
      })
    ).toBe(
      "OPB-260003 • Entry Date: 01.01.2026 • Created: 16.06.2026 • Submitted: 16.06.2026 • Confirmed: 16.06.2026"
    )
  })
})
