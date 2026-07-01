import { buildFinanceVoucherPrintModelFromManualJournalEntryPdfSnapshot } from "@/lib/finance-ui/finance-voucher-print-from-snapshot"
import { buildFinanceVoucherPrintModelFromManualJournalEntry } from "@/lib/finance-ui/finance-voucher-print"
import type { ManualJournalEntryRead } from "@/lib/finance/manual-journal-entry/manual-journal-entry-read-types"
import type { ManualJournalEntryPdfSnapshot } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-snapshot-types"

function mjv260001Entry(): ManualJournalEntryRead {
  return {
    id: "entry-1",
    entryNo: "MJV-260001",
    entryType: "MANUAL",
    status: "POSTED",
    branchId: "branch-1",
    branchCode: "HO999",
    branchName: "Head Office",
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
    pdfPath: "manual-journal/entry-1.pdf",
    pdfBlobUrl: null,
    pdfGeneratedAt: "2026-06-14T16:00:00.000Z",
    pdfSnapshotReady: true,
    createdAt: "2026-06-14T11:00:00.000Z",
    updatedAt: "2026-06-14T15:00:00.000Z",
    lines: [
      {
        id: "line-1",
        lineNo: 1,
        glAccountId: "acc-1",
        accountCode: "1100",
        accountName: "เงินสด",
        debit: "100.00",
        credit: "0.00",
        memo: "เงินสดในมือ",
      },
      {
        id: "line-2",
        lineNo: 2,
        glAccountId: "acc-2",
        accountCode: "4100",
        accountName: "รายได้",
        debit: "0.00",
        credit: "100.00",
        memo: null,
      },
    ],
  }
}

function mjv260001Snapshot(): ManualJournalEntryPdfSnapshot {
  return {
    snapshotVersion: 1,
    entryId: "entry-1",
    entryNo: "MJV-260001",
    entryType: "MANUAL",
    entryTypeLabel: "Manual Journal Voucher",
    branchId: "branch-1",
    branchCode: "HO999",
    branchName: "Head Office",
    legalEntityCode: "AS",
    entryDate: "2026-06-14",
    description: "Month-end accrual",
    refNo: "REF-100",
    createdAt: "2026-06-14T11:00:00.000Z",
    submittedAt: "2026-06-14T13:00:00.000Z",
    confirmedAt: "2026-06-14T14:00:00.000Z",
    postedAt: "2026-06-14T15:00:00.000Z",
    createdByStaffId: "staff-prep",
    submittedByStaffId: "staff-appr",
    confirmedByStaffId: "staff-check",
    postedByStaffId: "staff-post",
    postedVoucherId: "voucher-1",
    postedVoucherNo: "MJV-260001",
    postedJournalEntryId: "journal-1",
    lines: [
      {
        lineNo: 1,
        accountCode: "1100",
        accountName: "เงินสด",
        debit: "100.00",
        credit: "0.00",
        memo: "เงินสดในมือ",
      },
      {
        lineNo: 2,
        accountCode: "4100",
        accountName: "รายได้",
        debit: "0.00",
        credit: "100.00",
        memo: null,
      },
    ],
    totalDebit: "100.00",
    totalCredit: "100.00",
  }
}

describe("buildFinanceVoucherPrintModelFromManualJournalEntryPdfSnapshot", () => {
  it("matches browser print model for MJV-260001", () => {
    const fromEntry = buildFinanceVoucherPrintModelFromManualJournalEntry(mjv260001Entry())
    const fromSnapshot = buildFinanceVoucherPrintModelFromManualJournalEntryPdfSnapshot(
      mjv260001Snapshot()
    )

    expect(fromSnapshot.branchLabel).toBe("HO999 • Head Office")
    expect(fromEntry.branchLabel).toBe("HO999 • Head Office")

    expect(fromSnapshot.documentNo).toBe(fromEntry.documentNo)
    expect(fromSnapshot.documentTypeCode).toBe(fromEntry.documentTypeCode)
    expect(fromSnapshot.documentDate).toBe(fromEntry.documentDate)
    expect(fromSnapshot.lines).toEqual(fromEntry.lines)
    expect(Number(fromSnapshot.totalDebit)).toBe(Number(fromEntry.totalDebit))
    expect(Number(fromSnapshot.totalCredit)).toBe(Number(fromEntry.totalCredit))
    expect(fromSnapshot.preparedBy).toBe(fromEntry.preparedBy)
    expect(fromSnapshot.checkedBy).toBe(fromEntry.checkedBy)
    expect(fromSnapshot.approvedBy).toBe(fromEntry.approvedBy)
    expect(fromSnapshot.postedBy).toBe(fromEntry.postedBy)
    expect(fromSnapshot.accountingVoucherId).toBe(fromEntry.accountingVoucherId)
  })

  it("does not render branchId UUID when snapshot lacks branch code/name", () => {
    const model = buildFinanceVoucherPrintModelFromManualJournalEntryPdfSnapshot({
      ...mjv260001Snapshot(),
      branchId: "4778631f-a86c-45c4-82cf-09520087ee1a",
      branchCode: null,
      branchName: null,
    })

    expect(model.branchLabel).toBe("—")
    expect(model.branchLabel).not.toContain("4778631f")
  })

  it("uses resolved branch override when snapshot branchCode is a UUID", () => {
    const model = buildFinanceVoucherPrintModelFromManualJournalEntryPdfSnapshot(
      {
        ...mjv260001Snapshot(),
        branchId: "4778631f-a86c-45c4-82cf-09520087ee1a",
        branchCode: "4778631f-a86c-45c4-82cf-09520087ee1a",
        branchName: null,
      },
      { branchLabel: "HO999 • Head Office" }
    )

    expect(model.branchLabel).toBe("HO999 • Head Office")
    expect(model.branchLabel).not.toContain("4778631f")
  })
})
