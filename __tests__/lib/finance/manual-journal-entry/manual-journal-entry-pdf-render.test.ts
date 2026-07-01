jest.mock("playwright", () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({
        setContent: jest.fn().mockResolvedValue(undefined),
        emulateMedia: jest.fn().mockResolvedValue(undefined),
        pdf: jest.fn().mockResolvedValue(Buffer.from("%PDF-1.4 canonical")),
        close: jest.fn().mockResolvedValue(undefined),
      }),
      close: jest.fn().mockResolvedValue(undefined),
    }),
  },
}))

import { renderManualJournalEntryPdf } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-render"
import { buildManualJournalEntryPdfDocumentHtml } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-document-html"
import type { ManualJournalEntryPdfSnapshot } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-snapshot-types"

const thaiSample = "เงินสดในมือ"

const snapshot: ManualJournalEntryPdfSnapshot = {
  snapshotVersion: 1,
  entryId: "00000000-0000-0000-0000-000000000001",
  entryNo: "MJV-260001",
  entryType: "MANUAL",
  entryTypeLabel: "Manual Journal Voucher",
  branchId: "branch-1",
  legalEntityCode: "AD",
  entryDate: "2026-01-01",
  description: thaiSample,
  refNo: null,
  createdAt: "2026-06-14T12:00:00.000Z",
  submittedAt: "2026-06-14T13:00:00.000Z",
  confirmedAt: "2026-06-14T14:00:00.000Z",
  postedAt: "2026-06-18T09:59:22.252Z",
  createdByStaffId: "001",
  submittedByStaffId: "002",
  confirmedByStaffId: "003",
  postedByStaffId: "001",
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
      memo: thaiSample,
    },
  ],
  totalDebit: "100.00",
  totalCredit: "100.00",
}

describe("renderManualJournalEntryPdf", () => {
  it("renders archived PDF from canonical FinanceVoucherPrintSheet HTML", async () => {
    const html = await buildManualJournalEntryPdfDocumentHtml({ snapshot })

    expect(html).toContain('data-testid="finance-voucher-print-sheet"')
    expect(html).toContain("END OF VOUCHER")
    expect(html).toContain(thaiSample)
    expect(html).not.toContain("Line  Account   Name")

    const buffer = await renderManualJournalEntryPdf(snapshot)
    expect(buffer.toString("utf8")).toMatch(/^%PDF/)
  })
})
