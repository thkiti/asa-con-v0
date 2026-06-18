import { renderManualJournalEntryPdf } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-render"
import type { ManualJournalEntryPdfSnapshot } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-snapshot-types"

const thaiSample = "เงินสดในมือ"

const snapshot: ManualJournalEntryPdfSnapshot = {
  snapshotVersion: 1,
  entryId: "00000000-0000-0000-0000-000000000001",
  entryNo: "OPB-260001",
  entryType: "OPENING_BALANCE",
  entryTypeLabel: "Opening Balance Journal",
  branchId: "branch-1",
  legalEntityCode: "AD",
  entryDate: "2026-01-01",
  description: thaiSample,
  refNo: null,
  postedAt: "2026-06-18T09:59:22.252Z",
  postedByStaffId: "001",
  postedVoucherId: "voucher-1",
  postedVoucherNo: "V-001",
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

describe("renderManualJournalEntryPdf Thai font", () => {
  it("embeds Noto Sans Thai and preserves Thai text in the PDF stream", async () => {
    const buffer = await renderManualJournalEntryPdf(snapshot)
    const pdfText = buffer.toString("latin1")

    expect(pdfText).toMatch(/FontFile2|FontFile3/)
    expect(pdfText).toMatch(/NotoSansThai/)
    expect(pdfText).not.toMatch(/\/BaseFont\s*\/Helvetica\b/)
  })
})
