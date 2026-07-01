jest.mock("@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-render", () => ({
  renderManualJournalEntryPdf: jest.fn(),
}))

jest.mock("@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-storage", () => ({
  storeManualJournalPdf: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    manualJournalEntry: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
  },
}))

import { renderManualJournalEntryPdf } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-render"
import { attachManualJournalEntryPdfFromSnapshot } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf"
import { storeManualJournalPdf } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-storage"
import { applyPdfSnapshot } from "@/lib/finance/manual-journal-entry/manual-journal-entry-status"
import { prisma } from "@/lib/shared/prisma"

jest.mock("@/lib/finance/manual-journal-entry/manual-journal-entry-status", () => ({
  applyPdfSnapshot: jest.fn(),
}))

const mockFindFirst = prisma.manualJournalEntry.findFirst as jest.Mock
const mockRender = renderManualJournalEntryPdf as jest.Mock
const mockStore = storeManualJournalPdf as jest.Mock
const mockApplyPdfSnapshot = applyPdfSnapshot as jest.Mock

const snapshot = {
  snapshotVersion: 1 as const,
  entryId: "11111111-1111-1111-1111-111111111111",
  entryNo: "MJV-260001",
  entryType: "MANUAL" as const,
  entryTypeLabel: "Manual Journal Voucher",
  branchId: "branch-1",
  legalEntityCode: "AS",
  entryDate: "2026-06-14",
  description: null,
  refNo: null,
  createdAt: "2026-06-14T08:00:00.000Z",
  submittedAt: "2026-06-14T09:00:00.000Z",
  confirmedAt: "2026-06-14T10:00:00.000Z",
  postedAt: "2026-06-15T10:00:00.000Z",
  createdByStaffId: "staff-prep",
  submittedByStaffId: "staff-appr",
  confirmedByStaffId: "staff-check",
  postedByStaffId: "staff-post",
  postedVoucherId: "voucher-1",
  postedVoucherNo: "V-001",
  postedJournalEntryId: "journal-1",
  lines: [],
  totalDebit: "100",
  totalCredit: "100",
}

describe("attachManualJournalEntryPdfFromSnapshot", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRender.mockResolvedValue(Buffer.from("%PDF"))
    mockStore.mockResolvedValue({
      pdfPath: "manual-journal/11111111-1111-1111-1111-111111111111.pdf",
      pdfBlobUrl: null,
    })
    mockApplyPdfSnapshot.mockResolvedValue({
      id: snapshot.entryId,
      pdfPath: "manual-journal/11111111-1111-1111-1111-111111111111.pdf",
    })
  })

  it("renders frozen snapshot once and persists pdfPath", async () => {
    mockFindFirst.mockResolvedValue({ status: "POSTED", pdfPath: null, pdfGeneratedAt: null })

    const result = await attachManualJournalEntryPdfFromSnapshot(snapshot.entryId, snapshot)

    expect(result.ok).toBe(true)
    expect(mockRender).toHaveBeenCalledWith(snapshot)
    expect(mockStore).toHaveBeenCalled()
    expect(mockApplyPdfSnapshot).toHaveBeenCalled()
  })

  it("skips render when pdfPath already exists", async () => {
    mockFindFirst.mockResolvedValue({
      status: "POSTED",
      pdfPath: "manual-journal/11111111-1111-1111-1111-111111111111.pdf",
      pdfGeneratedAt: new Date("2026-06-15T10:01:00.000Z"),
    })

    const result = await attachManualJournalEntryPdfFromSnapshot(snapshot.entryId, snapshot)

    expect(result.ok).toBe(true)
    expect(mockRender).not.toHaveBeenCalled()
    expect(mockStore).not.toHaveBeenCalled()
  })

  it("returns ok false when render fails without throwing", async () => {
    mockFindFirst.mockResolvedValue({ status: "POSTED", pdfPath: null, pdfGeneratedAt: null })
    mockRender.mockRejectedValue(new Error("render failed"))

    const result = await attachManualJournalEntryPdfFromSnapshot(snapshot.entryId, snapshot)

    expect(result).toEqual({ ok: false, error: "render failed" })
    expect(mockApplyPdfSnapshot).not.toHaveBeenCalled()
  })
})
