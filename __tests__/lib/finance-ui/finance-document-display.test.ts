import {
  buildFinanceDocumentAuditLine,
  buildFinanceDocumentIdentityRow1,
  buildFinanceDocumentIdentityRow2,
  buildFinanceDocumentWorkflowAuditLine,
  formatFinanceDocumentDate,
  formatFinanceDocumentPeriodKey,
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

describe("formatFinanceDocumentPeriodKey", () => {
  it("derives YYYY-MM from entry date", () => {
    expect(formatFinanceDocumentPeriodKey("2026-01-01")).toBe("2026-01")
    expect(formatFinanceDocumentPeriodKey("2026-06-14T12:00:00.000Z")).toBe("2026-06")
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

describe("canonical finance document identity rows", () => {
  it("builds Row 1 with entity short and document type title", () => {
    expect(buildFinanceDocumentIdentityRow1("AD", "OPENING_BALANCE")).toBe(
      "ASAD • OPENING BALANCE"
    )
    expect(buildFinanceDocumentIdentityRow1("AS", "MANUAL")).toBe(
      "ASAS • MANUAL JOURNAL VOUCHER"
    )
  })

  it("builds Row 2 with document no, entry date, period, and status", () => {
    expect(
      buildFinanceDocumentIdentityRow2({
        documentNo: "OPB-260001",
        entryDate: "2026-01-01",
        status: "POSTED",
      })
    ).toBe(
      "OPB-260001 • Entry Date: 01.01.2026 • Period: 2026-01 • Status: POSTED"
    )
  })

  it("builds supplementary workflow audit line without document no", () => {
    expect(
      buildFinanceDocumentWorkflowAuditLine({
        createdAt: "2026-06-14T12:00:00.000Z",
        submittedAt: "2026-06-14T13:00:00.000Z",
        confirmedAt: "2026-06-14T14:00:00.000Z",
        postedAt: "2026-06-14T15:00:00.000Z",
      })
    ).toBe(
      "Created: 14.06.2026 • Submitted: 14.06.2026 • Confirmed: 14.06.2026 • Posted: 14.06.2026"
    )
  })
})
