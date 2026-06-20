import { buildFinanceVoucherPrintModelFromManualJournalEntry } from "@/lib/finance-ui/finance-voucher-print"
import type { ManualJournalEntryRead } from "@/lib/finance/manual-journal-entry/manual-journal-entry-read-types"

function baseEntry(overrides: Partial<ManualJournalEntryRead> = {}): ManualJournalEntryRead {
  return {
    id: "entry-1",
    entryNo: "MAJ-260001",
    entryType: "MANUAL",
    status: "POSTED",
    branchId: "branch-1",
    legalEntityCode: "AS",
    entryDate: "2026-06-14T12:00:00.000Z",
    description: "Month-end accrual",
    refNo: "REF-100",
    createdByStaffId: "staff-prep",
    submittedAt: "2026-06-14T13:00:00.000Z",
    submittedByStaffId: "staff-appr",
    confirmedAt: "2026-06-14T14:00:00.000Z",
    confirmedByStaffId: "staff-check",
    postedAt: "2026-06-14T15:00:00.000Z",
    postedByStaffId: "staff-post",
    cancelledAt: null,
    cancelledByStaffId: null,
    cancelReason: null,
    postedVoucherId: "voucher-1",
    postedJournalEntryId: "journal-1",
    reversalJournalEntryId: null,
    pdfPath: null,
    pdfBlobUrl: null,
    pdfGeneratedAt: null,
    pdfSnapshotReady: false,
    createdAt: "2026-06-14T11:00:00.000Z",
    updatedAt: "2026-06-14T15:00:00.000Z",
    lines: [
      {
        id: "line-1",
        lineNo: 1,
        glAccountId: "acc-1",
        accountCode: "1100",
        accountName: "Cash",
        debit: "100.00",
        credit: "0.00",
        memo: "Line memo",
      },
      {
        id: "line-2",
        lineNo: 2,
        glAccountId: "acc-2",
        accountCode: "4100",
        accountName: "Revenue",
        debit: "0.00",
        credit: "100.00",
        memo: null,
      },
    ],
    ...overrides,
  }
}

describe("finance-voucher-print", () => {
  it("maps saved manual journal entry to print model without recalculation path", () => {
    const model = buildFinanceVoucherPrintModelFromManualJournalEntry(baseEntry(), {
      branchLabel: "HO999 — Head Office",
    })

    expect(model.documentTypeCode).toBe("MAJ")
    expect(model.documentNo).toBe("MAJ-260001")
    expect(model.branchLabel).toBe("HO999 — Head Office")
    expect(model.reference).toBe("REF-100")
    expect(model.description).toBe("Month-end accrual")
    expect(model.totalDebit).toBe("100")
    expect(model.totalCredit).toBe("100")
    expect(model.preparedBy).toBe("staff-prep")
    expect(model.checkedBy).toBe("staff-check")
    expect(model.approvedBy).toBe("staff-appr")
    expect(model.postedBy).toBe("staff-post")
    expect(model.lines).toHaveLength(2)
    expect(model.lines[0].lineDescription).toBe("Line memo")
  })

  it("derives OPB document type code from entry number prefix", () => {
    const model = buildFinanceVoucherPrintModelFromManualJournalEntry(
      baseEntry({ entryNo: "OPB-260002", entryType: "OPENING_BALANCE" })
    )
    expect(model.documentTypeCode).toBe("OPB")
    expect(model.documentTypeTitle).toBe("OPENING BALANCE")
  })
})
