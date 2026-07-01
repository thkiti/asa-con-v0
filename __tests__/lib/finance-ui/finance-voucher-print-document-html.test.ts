import { buildManualJournalEntryPdfDocumentHtml } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-document-html"
import type { ManualJournalEntryPdfSnapshot } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-snapshot-types"

const mjv260001Snapshot: ManualJournalEntryPdfSnapshot = {
  snapshotVersion: 1,
  entryId: "entry-1",
  entryNo: "MJV-260001",
  entryType: "MANUAL",
  entryTypeLabel: "Manual Journal Voucher",
  branchId: "branch-1",
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
  ],
  totalDebit: "100.00",
  totalCredit: "100.00",
}

describe("buildManualJournalEntryPdfDocumentHtml", () => {
  it("uses FinanceVoucherPrintSheet markup for archived PDF generation", async () => {
    const html = await buildManualJournalEntryPdfDocumentHtml({ snapshot: mjv260001Snapshot })

    expect(html).toContain('data-testid="finance-voucher-print-sheet"')
    expect(html).toContain('data-testid="finance-document-header"')
    expect(html).toContain("MANUAL JOURNAL VOUCHER")
    expect(html).toContain("MJV-260001")
    expect(html).toContain(">Account<")
    expect(html).toContain(">Debit<")
    expect(html).toContain(">Credit<")
    expect(html).toContain(">Line Description<")
    expect(html).toContain("END OF VOUCHER")
    expect(html).toContain("Prepared By")
    expect(html).toContain("เงินสด")
    expect(html).toContain("finance-voucher-print-active")
    expect(html).toContain("@font-face")
    expect(html).toContain("THSarabunNew")
    expect(html).not.toContain("Line  Account   Name")
  })
})
