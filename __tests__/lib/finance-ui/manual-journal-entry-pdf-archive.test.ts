import {
  LEGACY_PDF_SNAPSHOT_REPLACE_NOT_UPDATED_ERROR,
  verifyArchivedPdfRegenerationResult,
} from "@/lib/finance-ui/manual-journal-entry-pdf-archive"
import type { ManualJournalEntryRead } from "@/lib/finance/manual-journal-entry/manual-journal-entry-read-types"

const baseEntry = {
  id: "entry-1",
  entryNo: "MJV-260001",
  entryType: "MANUAL" as const,
  status: "POSTED" as const,
  branchId: "branch-1",
  branchCode: "HO999",
  branchName: "Head Office",
  legalEntityCode: "AS",
  entryDate: "2026-01-31T00:00:00.000Z",
  description: "Test",
  refNo: null,
  createdByStaffId: "staff-1",
  submittedAt: null,
  submittedByStaffId: null,
  confirmedAt: null,
  confirmedByStaffId: null,
  postedAt: "2026-01-31T12:00:00.000Z",
  postedByStaffId: "staff-1",
  cancelledAt: null,
  cancelledByStaffId: null,
  cancelReason: null,
  postedVoucherId: "voucher-1",
  postedJournalEntryId: "journal-1",
  reversalJournalEntryId: null,
  pdfPath: "manual-journal/entry-1.pdf",
  pdfBlobUrl: null,
  pdfGeneratedAt: "2026-01-31T12:01:00.000Z",
  pdfSnapshotReady: true,
  createdAt: "2026-01-31T09:00:00.000Z",
  updatedAt: "2026-01-31T12:00:00.000Z",
  lines: [],
} satisfies ManualJournalEntryRead

describe("verifyArchivedPdfRegenerationResult", () => {
  it("passes when first-time generation creates a ready archive", () => {
    expect(
      verifyArchivedPdfRegenerationResult({
        hadArchive: false,
        beforePdfGeneratedAt: null,
        afterEntry: baseEntry,
      })
    ).toBeNull()
  })

  it("passes when replace updates pdfGeneratedAt", () => {
    expect(
      verifyArchivedPdfRegenerationResult({
        hadArchive: true,
        beforePdfGeneratedAt: "2026-01-31T12:01:00.000Z",
        afterEntry: {
          ...baseEntry,
          pdfGeneratedAt: "2026-01-31T12:10:00.000Z",
        },
      })
    ).toBeNull()
  })

  it("fails when replace leaves pdfGeneratedAt unchanged", () => {
    expect(
      verifyArchivedPdfRegenerationResult({
        hadArchive: true,
        beforePdfGeneratedAt: "2026-01-31T12:01:00.000Z",
        afterEntry: baseEntry,
      })
    ).toBe(LEGACY_PDF_SNAPSHOT_REPLACE_NOT_UPDATED_ERROR)
  })

  it("fails when archive is no longer ready after replace", () => {
    expect(
      verifyArchivedPdfRegenerationResult({
        hadArchive: true,
        beforePdfGeneratedAt: "2026-01-31T12:01:00.000Z",
        afterEntry: {
          ...baseEntry,
          pdfSnapshotReady: false,
          pdfGeneratedAt: null,
          pdfPath: null,
        },
      })
    ).toBe(LEGACY_PDF_SNAPSHOT_REPLACE_NOT_UPDATED_ERROR)
  })
})
