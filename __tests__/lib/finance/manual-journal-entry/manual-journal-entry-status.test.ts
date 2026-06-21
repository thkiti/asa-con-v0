import type { ManualJournalEntryWithLines } from "@/lib/finance/manual-journal-entry/manual-journal-entry-types"
import {
  ManualJournalEntryErrorCodes,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-errors"
import {
  applyCancelledStatus,
  applyConfirmedStatus,
  applyPdfSnapshotRepair,
  applyPostedStatus,
  applySubmittedStatus,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-status"

function entry(
  partial: Partial<ManualJournalEntryWithLines> &
    Pick<ManualJournalEntryWithLines, "status">
): ManualJournalEntryWithLines {
  return {
    id: "entry-1",
    entryNo: "MJV-260001",
    entryType: "MANUAL",
    branchId: "branch-1",
    legalEntityCode: "ASAS",
    entryDate: new Date("2026-06-14"),
    description: null,
    refNo: null,
    createdByStaffId: "staff-create",
    submittedAt: null,
    submittedByStaffId: null,
    confirmedAt: null,
    confirmedByStaffId: null,
    postedAt: null,
    postedByStaffId: null,
    cancelledAt: null,
    cancelledByStaffId: null,
    cancelReason: null,
    postedVoucherId: null,
    postedJournalEntryId: null,
    reversalJournalEntryId: null,
    pdfPath: null,
    pdfBlobUrl: null,
    pdfGeneratedAt: null,
    createdAt: new Date("2026-06-01"),
    updatedAt: new Date("2026-06-01"),
    lines: [],
    ...partial,
  }
}

function createMockTx(initial: ManualJournalEntryWithLines) {
  let current = { ...initial, lines: [...initial.lines] }

  const tx = {
    manualJournalEntry: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id !== current.id) return null
        return { ...current, lines: [...current.lines] }
      }),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        current = {
          ...current,
          ...data,
          lines: current.lines,
        } as ManualJournalEntryWithLines
        return { ...current, lines: [...current.lines] }
      }),
    },
  }

  return {
    tx,
    getEntry: () => ({ ...current, lines: [...current.lines] }),
  }
}

describe("manual-journal-entry-status", () => {
  describe("applySubmittedStatus", () => {
    it("sets SUBMITTED and submit audit fields", async () => {
      const { tx, getEntry } = createMockTx(entry({ status: "DRAFT" }))

      const updated = await applySubmittedStatus(tx as never, {
        entryId: "entry-1",
        submittedByStaffId: "staff-submit",
      })

      expect(updated.status).toBe("SUBMITTED")
      expect(updated.submittedByStaffId).toBe("staff-submit")
      expect(updated.submittedAt).toBeInstanceOf(Date)
      expect(getEntry().status).toBe("SUBMITTED")
    })

    it("rejects when entry not found", async () => {
      const { tx } = createMockTx(entry({ status: "DRAFT", id: "other" }))

      await expect(
        applySubmittedStatus(tx as never, {
          entryId: "missing",
          submittedByStaffId: "staff-1",
        })
      ).rejects.toMatchObject({
        code: ManualJournalEntryErrorCodes.ENTRY_NOT_FOUND,
      })
    })
  })

  describe("applyConfirmedStatus", () => {
    it("sets CONFIRMED and confirm audit fields", async () => {
      const { tx, getEntry } = createMockTx(
        entry({
          status: "SUBMITTED",
          submittedAt: new Date("2026-06-10"),
          submittedByStaffId: "staff-submit",
        })
      )

      const updated = await applyConfirmedStatus(tx as never, {
        entryId: "entry-1",
        confirmedByStaffId: "staff-confirm",
      })

      expect(updated.status).toBe("CONFIRMED")
      expect(updated.confirmedByStaffId).toBe("staff-confirm")
      expect(updated.confirmedAt).toBeInstanceOf(Date)
      expect(getEntry().status).toBe("CONFIRMED")
    })
  })

  describe("applyPostedStatus", () => {
    it("sets POSTED and post audit fields", async () => {
      const { tx, getEntry } = createMockTx(
        entry({
          status: "CONFIRMED",
          confirmedAt: new Date("2026-06-11"),
          confirmedByStaffId: "staff-confirm",
        })
      )

      const updated = await applyPostedStatus(tx as never, {
        entryId: "entry-1",
        postedByStaffId: "staff-post",
      })

      expect(updated.status).toBe("POSTED")
      expect(updated.postedByStaffId).toBe("staff-post")
      expect(updated.postedAt).toBeInstanceOf(Date)
      expect(getEntry().status).toBe("POSTED")
    })

    it("rejects POST from SUBMITTED", async () => {
      const { tx } = createMockTx(entry({ status: "SUBMITTED" }))

      await expect(
        applyPostedStatus(tx as never, {
          entryId: "entry-1",
          postedByStaffId: "staff-post",
        })
      ).rejects.toMatchObject({
        code: ManualJournalEntryErrorCodes.INVALID_TRANSITION,
      })
    })
  })

  describe("applyCancelledStatus", () => {
    it("sets CANCELLED and cancel audit fields", async () => {
      const { tx, getEntry } = createMockTx(entry({ status: "SUBMITTED" }))

      const updated = await applyCancelledStatus(tx as never, {
        entryId: "entry-1",
        cancelledByStaffId: "staff-cancel",
        cancelReason: "duplicate",
      })

      expect(updated.status).toBe("CANCELLED")
      expect(updated.cancelledByStaffId).toBe("staff-cancel")
      expect(updated.cancelReason).toBe("duplicate")
      expect(updated.cancelledAt).toBeInstanceOf(Date)
      expect(getEntry().status).toBe("CANCELLED")
    })

    it("rejects cancel from POSTED", async () => {
      const { tx } = createMockTx(entry({ status: "POSTED" }))

      await expect(
        applyCancelledStatus(tx as never, {
          entryId: "entry-1",
          cancelledByStaffId: "staff-1",
        })
      ).rejects.toMatchObject({
        code: ManualJournalEntryErrorCodes.IMMUTABLE_ENTRY,
      })
    })
  })

  describe("applyPdfSnapshotRepair", () => {
    it("updates only PDF metadata and leaves accounting fields unchanged", async () => {
      const postedAt = new Date("2026-06-15T10:00:00.000Z")
      const { tx, getEntry } = createMockTx(
        entry({
          status: "POSTED",
          postedAt,
          postedByStaffId: "staff-post",
          postedJournalEntryId: "journal-1",
          postedVoucherId: "voucher-1",
          pdfPath: "manual-journal/entry-1.pdf",
          pdfGeneratedAt: new Date("2026-06-15T10:01:00.000Z"),
        })
      )

      const repairAt = new Date("2026-06-20T12:00:00.000Z")
      const updated = await applyPdfSnapshotRepair(tx as never, {
        entryId: "entry-1",
        pdfPath: "manual-journal/entry-1.pdf",
        pdfBlobUrl: null,
        pdfGeneratedAt: repairAt,
      })

      expect(updated.pdfGeneratedAt).toEqual(repairAt)
      expect(updated.postedAt).toEqual(postedAt)
      expect(updated.postedJournalEntryId).toBe("journal-1")
      expect(updated.postedVoucherId).toBe("voucher-1")
      expect(updated.status).toBe("POSTED")
      expect(getEntry().postedAt).toEqual(postedAt)
      expect(getEntry().postedJournalEntryId).toBe("journal-1")
    })

    it("rejects repair for non-POSTED entries", async () => {
      const { tx } = createMockTx(
        entry({
          status: "CONFIRMED",
          pdfPath: "manual-journal/entry-1.pdf",
        })
      )

      await expect(
        applyPdfSnapshotRepair(tx as never, {
          entryId: "entry-1",
          pdfPath: "manual-journal/entry-1.pdf",
          pdfGeneratedAt: new Date(),
        })
      ).rejects.toMatchObject({
        code: ManualJournalEntryErrorCodes.INVALID_TRANSITION,
      })
    })

    it("rejects repair when no archived PDF exists", async () => {
      const { tx } = createMockTx(entry({ status: "POSTED" }))

      await expect(
        applyPdfSnapshotRepair(tx as never, {
          entryId: "entry-1",
          pdfPath: "manual-journal/entry-1.pdf",
          pdfGeneratedAt: new Date(),
        })
      ).rejects.toMatchObject({
        code: ManualJournalEntryErrorCodes.PDF_MISSING,
      })
    })
  })
})
