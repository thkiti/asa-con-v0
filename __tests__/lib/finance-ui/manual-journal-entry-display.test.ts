import {
  computeManualJournalLineTotals,
  formatManualJournalEntryDocumentNo,
  manualJournalEntryTypeCode,
} from "@/lib/finance-ui/manual-journal-entry-display"

describe("manual-journal-entry-display", () => {
  it("formats document number without legal entity prefix", () => {
    expect(formatManualJournalEntryDocumentNo("MAJ-260001")).toBe("MAJ-260001")
    expect(formatManualJournalEntryDocumentNo("OPB-260001")).toBe("OPB-260001")
    expect(formatManualJournalEntryDocumentNo(null, "MANUAL")).toBe("MAJ (draft)")
  })

  it("maps entry type codes", () => {
    expect(manualJournalEntryTypeCode("OPENING_BALANCE")).toBe("OPB")
    expect(manualJournalEntryTypeCode("AUDITOR_ADJUSTMENT")).toBe("AUJ")
  })

  it("detects unbalanced lines", () => {
    const balanced = computeManualJournalLineTotals([
      { debit: "100", credit: "0" },
      { debit: "0", credit: "100" },
    ])
    expect(balanced.balanced).toBe(true)

    const unbalanced = computeManualJournalLineTotals([
      { debit: "100", credit: "0" },
      { debit: "0", credit: "50" },
    ])
    expect(unbalanced.balanced).toBe(false)
    expect(unbalanced.difference).toBe(50)
  })
})
