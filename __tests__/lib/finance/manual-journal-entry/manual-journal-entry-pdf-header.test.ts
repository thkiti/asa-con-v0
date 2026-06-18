import { buildManualJournalPdfHeaderLines } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-header"

describe("manual-journal-entry-pdf-header", () => {
  it("builds 3-row opening balance header for OPB-260001", () => {
    const header = buildManualJournalPdfHeaderLines({
      entryType: "OPENING_BALANCE",
      legalEntityCode: "AD",
      entryNo: "OPB-260001",
      entryDate: "2026-01-01",
      postedAt: "2026-06-18T09:59:22.252Z",
      description: "Opening balances for Jan 2026",
    })

    expect(header.row1).toBe("ASAD • OPENING BALANCE")
    expect(header.row2).toBe(
      "Document No: OPB-260001 • Period: 2026-01 • Status: POSTED"
    )
    expect(header.row3).toBe("Date: 01/01/2026 • Posted: 18/06/2026 16:59")
    expect(header.description).toBe("Opening balances for Jan 2026")
  })

  it("builds manual journal voucher header", () => {
    const header = buildManualJournalPdfHeaderLines({
      entryType: "MANUAL",
      legalEntityCode: "AD",
      entryNo: "MAJ-260001",
      entryDate: "2026-06-14",
      postedAt: "2026-06-15T10:00:00.000Z",
      description: null,
    })

    expect(header.row1).toBe("ASAD • MANUAL JOURNAL VOUCHER")
    expect(header.row2).toContain("Document No: MAJ-260001")
    expect(header.row2).toContain("Period: 2026-06")
    expect(header.row3).toContain("Date: 14/06/2026")
    expect(header.description).toBeNull()
  })

  it("uses bullet separators only", () => {
    const header = buildManualJournalPdfHeaderLines({
      entryType: "MANUAL",
      legalEntityCode: "AS",
      entryNo: "MAJ-260002",
      entryDate: "2026-06-14",
      postedAt: "2026-06-15T10:00:00.000Z",
      description: null,
    })

    expect(header.row1).not.toContain("|")
    expect(header.row2).not.toContain("|")
    expect(header.row3).not.toContain("|")
    expect(header.row1).toContain("•")
  })
})
