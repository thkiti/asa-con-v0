import { buildManualJournalPdfHeaderLines } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-header"

describe("manual-journal-entry-pdf-header", () => {
  it("builds compact document audit line for OPB-260001", () => {
    const header = buildManualJournalPdfHeaderLines({
      entryNo: "OPB-260001",
      entryDate: "2026-01-01",
      createdAt: "2026-06-14T12:00:00.000Z",
      submittedAt: "2026-06-14T13:00:00.000Z",
      confirmedAt: "2026-06-14T14:00:00.000Z",
      postedAt: "2026-06-18T09:59:22.252Z",
      description: "Opening balances for Jan 2026",
    })

    expect(header.auditLine).toBe(
      "OPB-260001 • Entry Date: 01.01.2026 • Created: 14.06.2026 • Submitted: 14.06.2026 • Confirmed: 14.06.2026 • Posted: 18.06.2026"
    )
    expect(header.description).toBe("Opening balances for Jan 2026")
  })

  it("builds manual journal audit line without optional workflow dates", () => {
    const header = buildManualJournalPdfHeaderLines({
      entryNo: "MAJ-260001",
      entryDate: "2026-06-14",
      createdAt: "2026-06-14T12:00:00.000Z",
      submittedAt: null,
      confirmedAt: null,
      postedAt: "2026-06-15T10:00:00.000Z",
      description: null,
    })

    expect(header.auditLine).toBe(
      "MAJ-260001 • Entry Date: 14.06.2026 • Created: 14.06.2026 • Posted: 15.06.2026"
    )
    expect(header.description).toBeNull()
  })

  it("uses bullet separators only", () => {
    const header = buildManualJournalPdfHeaderLines({
      entryNo: "MAJ-260002",
      entryDate: "2026-06-14",
      createdAt: "2026-06-14T12:00:00.000Z",
      submittedAt: "2026-06-14T13:00:00.000Z",
      confirmedAt: "2026-06-14T14:00:00.000Z",
      postedAt: "2026-06-15T10:00:00.000Z",
      description: null,
    })

    expect(header.auditLine).not.toContain("|")
    expect(header.auditLine).toContain("•")
  })
})
