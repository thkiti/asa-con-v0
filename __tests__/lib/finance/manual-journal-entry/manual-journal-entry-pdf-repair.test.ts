jest.mock("@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-storage-local", () => ({
  deleteLocalManualJournalPdfFile: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-render", () => ({
  renderManualJournalEntryPdf: jest.fn(),
}))

jest.mock("@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-storage", () => ({
  storeManualJournalPdf: jest.fn(),
  resolveManualJournalPdfStorageBackend: jest.fn(() => "filesystem"),
}))

const mockLoadSnapshot = jest.fn()

jest.mock("@/lib/finance/manual-journal-entry/manual-journal-entry-pdf", () => {
  const actual = jest.requireActual<
    typeof import("@/lib/finance/manual-journal-entry/manual-journal-entry-pdf")
  >("@/lib/finance/manual-journal-entry/manual-journal-entry-pdf")
  return {
    ...actual,
    loadPostedManualJournalEntryPdfSnapshot: (...args: unknown[]) =>
      mockLoadSnapshot(...args),
  }
})

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    manualJournalEntry: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
  },
}))

jest.mock("@/lib/finance/manual-journal-entry/manual-journal-entry-status", () => ({
  applyPdfSnapshot: jest.fn(),
  applyPdfSnapshotRepair: jest.fn(),
  applyPdfSnapshotClear: jest.fn(),
}))

import { renderManualJournalEntryPdf } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-render"
import { attachManualJournalEntryPdfFromSnapshot } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf"
import {
  deleteManualJournalEntryArchivedPdf,
  regenerateManualJournalEntryArchivedPdf,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-repair"
import { storeManualJournalPdf } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-storage"
import {
  applyPdfSnapshot,
  applyPdfSnapshotClear,
  applyPdfSnapshotRepair,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-status"
import { prisma } from "@/lib/shared/prisma"

const mockFindFirst = prisma.manualJournalEntry.findFirst as jest.Mock
const mockRender = renderManualJournalEntryPdf as jest.Mock
const mockStore = storeManualJournalPdf as jest.Mock
const mockApplyPdfSnapshot = applyPdfSnapshot as jest.Mock
const mockApplyPdfSnapshotRepair = applyPdfSnapshotRepair as jest.Mock
const mockApplyPdfSnapshotClear = applyPdfSnapshotClear as jest.Mock

const entryId = "11111111-1111-1111-1111-111111111111"

const snapshot = {
  snapshotVersion: 1 as const,
  entryId,
  entryNo: "MJV-260001",
  entryType: "MANUAL" as const,
  entryTypeLabel: "Manual Journal Voucher",
  branchId: "branch-1",
  legalEntityCode: "AS",
  entryDate: "2026-06-14",
  description: "เงินสด",
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

describe("regenerateManualJournalEntryArchivedPdf", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRender.mockResolvedValue(Buffer.from("%PDF"))
    mockStore.mockResolvedValue({
      pdfPath: `manual-journal/${entryId}.pdf`,
      pdfBlobUrl: null,
    })
    mockApplyPdfSnapshotRepair.mockResolvedValue({
      id: entryId,
      pdfPath: `manual-journal/${entryId}.pdf`,
    })
    mockLoadSnapshot.mockResolvedValue(snapshot)
  })

  it("re-renders and replaces an existing archived PDF for POSTED entries", async () => {
    mockFindFirst.mockResolvedValue({
      status: "POSTED",
      pdfPath: `manual-journal/${entryId}.pdf`,
      pdfBlobUrl: null,
    })

    const result = await regenerateManualJournalEntryArchivedPdf(entryId, "AS")

    expect(result.ok).toBe(true)
    expect(mockLoadSnapshot).toHaveBeenCalledWith(prisma, entryId, "AS")
    expect(mockRender).toHaveBeenCalledWith(snapshot)
    expect(mockStore).toHaveBeenCalledWith(entryId, expect.any(Buffer))
    expect(mockApplyPdfSnapshotRepair).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        entryId,
        pdfPath: `manual-journal/${entryId}.pdf`,
      })
    )
    expect(mockApplyPdfSnapshot).not.toHaveBeenCalled()
  })

  it("rejects repair for non-POSTED entries", async () => {
    mockFindFirst.mockResolvedValue({
      status: "CONFIRMED",
      pdfPath: `manual-journal/${entryId}.pdf`,
      pdfBlobUrl: null,
    })

    const result = await regenerateManualJournalEntryArchivedPdf(entryId, "AS")

    expect(result).toEqual({
      ok: false,
      error: "PDF snapshot repair requires POSTED status",
    })
    expect(mockRender).not.toHaveBeenCalled()
  })

  it("rejects repair when no archived PDF metadata exists", async () => {
    mockFindFirst.mockResolvedValue({
      status: "POSTED",
      pdfPath: null,
      pdfBlobUrl: null,
    })

    const result = await regenerateManualJournalEntryArchivedPdf(entryId, "AS")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("existing archived PDF")
    }
    expect(mockRender).not.toHaveBeenCalled()
  })
})

describe("deleteManualJournalEntryArchivedPdf", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockApplyPdfSnapshotClear.mockResolvedValue({
      id: entryId,
      pdfPath: null,
      pdfBlobUrl: null,
      pdfGeneratedAt: null,
    })
  })

  it("clears archived PDF metadata for POSTED entries", async () => {
    mockFindFirst.mockResolvedValue({
      status: "POSTED",
      pdfPath: `manual-journal/${entryId}.pdf`,
      pdfBlobUrl: null,
    })

    const result = await deleteManualJournalEntryArchivedPdf(entryId, "AS")

    expect(result.ok).toBe(true)
    expect(mockApplyPdfSnapshotClear).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ entryId })
    )
  })

  it("rejects delete when no archived PDF metadata exists", async () => {
    mockFindFirst.mockResolvedValue({
      status: "POSTED",
      pdfPath: null,
      pdfBlobUrl: null,
    })

    const result = await deleteManualJournalEntryArchivedPdf(entryId, "AS")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("No archived PDF")
    }
    expect(mockApplyPdfSnapshotClear).not.toHaveBeenCalled()
  })
})

describe("attachManualJournalEntryPdfFromSnapshot", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRender.mockResolvedValue(Buffer.from("%PDF"))
    mockStore.mockResolvedValue({
      pdfPath: `manual-journal/${entryId}.pdf`,
      pdfBlobUrl: null,
    })
    mockApplyPdfSnapshot.mockResolvedValue({
      id: entryId,
      pdfPath: `manual-journal/${entryId}.pdf`,
    })
  })

  it("still skips render when pdfPath already exists (normal attach path)", async () => {
    mockFindFirst.mockResolvedValue({
      status: "POSTED",
      pdfPath: `manual-journal/${entryId}.pdf`,
      pdfGeneratedAt: new Date("2026-06-15T10:01:00.000Z"),
    })

    const result = await attachManualJournalEntryPdfFromSnapshot(entryId, snapshot, {
      legalEntityCode: "AS",
    })

    expect(result.ok).toBe(true)
    expect(mockRender).not.toHaveBeenCalled()
    expect(mockApplyPdfSnapshotRepair).not.toHaveBeenCalled()
  })
})
