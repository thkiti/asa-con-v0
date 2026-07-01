jest.mock("@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-branch", () => ({
  resolveManualJournalEntrySnapshotBranchLabel: jest
    .fn()
    .mockResolvedValue("HO999 • Head Office"),
}))

jest.mock("playwright", () => {
  const page = {
    emulateMedia: jest.fn().mockResolvedValue(undefined),
    setViewportSize: jest.fn().mockResolvedValue(undefined),
    setContent: jest.fn().mockResolvedValue(undefined),
    pdf: jest.fn().mockResolvedValue(Buffer.from("%PDF-1.4 canonical")),
    close: jest.fn().mockResolvedValue(undefined),
  }
  const browser = {
    newPage: jest.fn().mockResolvedValue(page),
    close: jest.fn().mockResolvedValue(undefined),
  }
  return {
    chromium: {
      launch: jest.fn().mockResolvedValue(browser),
      __mockPage: page,
    },
  }
})

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
  branchCode: "HO999",
  branchName: "Head Office",
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
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders archived PDF from canonical FinanceVoucherPrintSheet HTML", async () => {
    const html = await buildManualJournalEntryPdfDocumentHtml({
      snapshot,
      branchLabel: "HO999 • Head Office",
    })

    expect(html).toContain("HO999 • Head Office")
    expect(html).not.toContain("branch-1")

    expect(html).toContain('data-testid="finance-voucher-print-sheet"')
    expect(html).toContain("END OF VOUCHER")
    expect(html).toContain(thaiSample)
    expect(html).not.toContain("Line  Account   Name")

    const buffer = await renderManualJournalEntryPdf(snapshot)
    expect(buffer.toString("utf8")).toMatch(/^%PDF/)
  })

  it("uses print media, A4 viewport, and CSS page size for archived PDF", async () => {
    const { chromium } = await import("playwright")
    await renderManualJournalEntryPdf(snapshot)

    const page = (chromium as unknown as { __mockPage: {
      emulateMedia: jest.Mock
      setViewportSize: jest.Mock
      pdf: jest.Mock
    } }).__mockPage

    expect(page.emulateMedia).toHaveBeenCalledWith({ media: "print" })
    expect(page.setViewportSize).toHaveBeenCalledWith({ width: 794, height: 1123 })
    expect(page.pdf).toHaveBeenCalledWith(
      expect.objectContaining({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: 0, bottom: 0, left: 0, right: 0 },
      })
    )
  })
})
