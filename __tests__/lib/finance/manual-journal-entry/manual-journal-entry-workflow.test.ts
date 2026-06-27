import { Prisma } from "@/generated/prisma/client"
import {
  ManualJournalEntryErrorCodes,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-errors"
import {
  createManualJournalEntryDraft,
  updateManualJournalEntryDraft,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-save"
import {
  cancelManualJournalEntry,
  confirmManualJournalEntry,
  deleteDraftManualJournalEntry,
  submitManualJournalEntry,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-workflow"
import {
  assertCanSubmitManualJournalEntry,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-validation"
import {
  balancedDraftLines,
  createManualJournalMockTx,
  draftEntry,
  resetManualJournalMockSeq,
} from "./mock-manual-journal-tx"

const defaultAccounts = [
  { id: "acc-1100", code: "1100", isActive: true, deleted: false },
  { id: "acc-5000", code: "5000", isActive: true, deleted: false },
]

const entityAs = "AS" as const

describe("manual-journal-entry-workflow", () => {
  const entryDate = new Date("2026-06-14T12:00:00.000Z")

  beforeEach(() => {
    resetManualJournalMockSeq()
  })

  async function createBalancedDraft(tx: ReturnType<typeof createManualJournalMockTx>["tx"]) {
    const draft = await createManualJournalEntryDraft({
      tx: tx as never,
      branchId: "branch-1",
      legalEntityCode: "AS",
      entryDate,
      entryType: "MANUAL",
      createdByStaffId: "staff-create",
      lines: [
        { accountCode: "1100", debit: 100, credit: 0 },
        { accountCode: "5000", debit: 0, credit: 100 },
      ],
    })
    return draft
  }

  describe("submitManualJournalEntry", () => {
    it("transitions DRAFT -> SUBMITTED with audit fields", async () => {
      const { tx } = createManualJournalMockTx(defaultAccounts)
      const draft = await createBalancedDraft(tx)

      const submitted = await submitManualJournalEntry({
        tx: tx as never,
        entryId: draft.id,
        legalEntityCode: entityAs,
        submittedByStaffId: "staff-submit",
      })

      expect(submitted.status).toBe("SUBMITTED")
      expect(submitted.submittedByStaffId).toBe("staff-submit")
      expect(submitted.submittedAt).toBeInstanceOf(Date)
      expect(tx.voucher.create).not.toHaveBeenCalled()
      expect(tx.journalEntry.create).not.toHaveBeenCalled()
    })

    it("blocks submit with fewer than two lines", async () => {
      const { tx } = createManualJournalMockTx(defaultAccounts)
      const draft = await createManualJournalEntryDraft({
        tx: tx as never,
        branchId: "branch-1",
        legalEntityCode: "AS",
        entryDate,
        entryType: "MANUAL",
        createdByStaffId: "staff-create",
        lines: [{ accountCode: "1100", debit: 100, credit: 0 }],
      })

      await expect(
        submitManualJournalEntry({
          tx: tx as never,
          entryId: draft.id,
          submittedByStaffId: "staff-submit",
        })
      ).rejects.toMatchObject({
        code: ManualJournalEntryErrorCodes.INSUFFICIENT_LINES,
      })
    })

    it("blocks submit when lines are unbalanced", async () => {
      const { tx } = createManualJournalMockTx(defaultAccounts)
      const draft = await createManualJournalEntryDraft({
        tx: tx as never,
        branchId: "branch-1",
        legalEntityCode: "AS",
        entryDate,
        entryType: "MANUAL",
        createdByStaffId: "staff-create",
        lines: [
          { accountCode: "1100", debit: 100, credit: 0 },
          { accountCode: "5000", debit: 0, credit: 50 },
        ],
      })

      await expect(
        submitManualJournalEntry({
          tx: tx as never,
          entryId: draft.id,
          submittedByStaffId: "staff-submit",
        })
      ).rejects.toMatchObject({
        code: ManualJournalEntryErrorCodes.UNBALANCED_ENTRY,
      })
    })
  })

  describe("confirmManualJournalEntry", () => {
    it("transitions SUBMITTED -> CONFIRMED", async () => {
      const { tx } = createManualJournalMockTx(defaultAccounts)
      const draft = await createBalancedDraft(tx)
      const submitted = await submitManualJournalEntry({
        tx: tx as never,
        entryId: draft.id,
        legalEntityCode: entityAs,
        submittedByStaffId: "staff-submit",
      })

      const confirmed = await confirmManualJournalEntry({
        tx: tx as never,
        entryId: submitted.id,
        legalEntityCode: entityAs,
        confirmedByStaffId: "staff-confirm",
      })

      expect(confirmed.status).toBe("CONFIRMED")
      expect(confirmed.confirmedByStaffId).toBe("staff-confirm")
      expect(confirmed.confirmedAt).toBeInstanceOf(Date)
      expect(tx.voucher.create).not.toHaveBeenCalled()
      expect(tx.journalEntry.create).not.toHaveBeenCalled()
    })

    it("rejects confirm from DRAFT", async () => {
      const { tx } = createManualJournalMockTx(defaultAccounts)
      const draft = await createBalancedDraft(tx)

      await expect(
        confirmManualJournalEntry({
          tx: tx as never,
          entryId: draft.id,
          legalEntityCode: entityAs,
          confirmedByStaffId: "staff-confirm",
        })
      ).rejects.toMatchObject({
        code: ManualJournalEntryErrorCodes.INVALID_TRANSITION,
      })
    })
  })

  describe("cancelManualJournalEntry", () => {
    it("cancels SUBMITTED entry", async () => {
      const { tx } = createManualJournalMockTx(defaultAccounts)
      const draft = await createBalancedDraft(tx)
      const submitted = await submitManualJournalEntry({
        tx: tx as never,
        entryId: draft.id,
        legalEntityCode: entityAs,
        submittedByStaffId: "staff-submit",
      })

      const cancelled = await cancelManualJournalEntry({
        tx: tx as never,
        entryId: submitted.id,
        legalEntityCode: entityAs,
        cancelledByStaffId: "staff-cancel",
        cancelReason: "wrong period",
      })

      expect(cancelled.status).toBe("CANCELLED")
      expect(cancelled.cancelledByStaffId).toBe("staff-cancel")
      expect(cancelled.cancelReason).toBe("wrong period")
      expect(tx.voucher.create).not.toHaveBeenCalled()
      expect(tx.journalEntry.create).not.toHaveBeenCalled()
    })

    it("cancels CONFIRMED entry", async () => {
      const { tx } = createManualJournalMockTx(defaultAccounts)
      const draft = await createBalancedDraft(tx)
      const submitted = await submitManualJournalEntry({
        tx: tx as never,
        entryId: draft.id,
        legalEntityCode: entityAs,
        submittedByStaffId: "staff-submit",
      })
      const confirmed = await confirmManualJournalEntry({
        tx: tx as never,
        entryId: submitted.id,
        legalEntityCode: entityAs,
        confirmedByStaffId: "staff-confirm",
      })

      const cancelled = await cancelManualJournalEntry({
        tx: tx as never,
        entryId: confirmed.id,
        legalEntityCode: entityAs,
        cancelledByStaffId: "staff-cancel",
      })

      expect(cancelled.status).toBe("CANCELLED")
    })

    it("rejects cancel from DRAFT", async () => {
      const { tx } = createManualJournalMockTx(defaultAccounts)
      const draft = await createBalancedDraft(tx)

      await expect(
        cancelManualJournalEntry({
          tx: tx as never,
          entryId: draft.id,
          legalEntityCode: entityAs,
          cancelledByStaffId: "staff-cancel",
        })
      ).rejects.toMatchObject({
        code: ManualJournalEntryErrorCodes.INVALID_TRANSITION,
      })
    })

    it.each(["POSTED", "CANCELLED"] as const)(
      "rejects cancel from terminal status %s",
      async (status) => {
        const { tx, seedEntry } = createManualJournalMockTx(defaultAccounts)
        seedEntry(
          draftEntry({ id: "terminal-entry", status }),
          balancedDraftLines().map((line) => ({
            ...line,
            manualJournalEntryId: "terminal-entry",
          }))
        )

        await expect(
          cancelManualJournalEntry({
            tx: tx as never,
            entryId: "terminal-entry",
            legalEntityCode: entityAs,
            cancelledByStaffId: "staff-cancel",
          })
        ).rejects.toMatchObject({
          code: ManualJournalEntryErrorCodes.IMMUTABLE_ENTRY,
        })
      }
    )
  })

  describe("deleteDraftManualJournalEntry", () => {
    it("removes DRAFT header and lines", async () => {
      const { tx, entries, lines } = createManualJournalMockTx(defaultAccounts)
      const draft = await createBalancedDraft(tx)

      await deleteDraftManualJournalEntry({
        tx: tx as never,
        entryId: draft.id,
        legalEntityCode: entityAs,
      })

      expect(entries.find((e) => e.id === draft.id)).toBeUndefined()
      expect(lines.some((line) => line.manualJournalEntryId === draft.id)).toBe(false)
      expect(tx.manualJournalEntryLine.deleteMany).toHaveBeenCalled()
      expect(tx.manualJournalEntry.delete).toHaveBeenCalled()
      expect(tx.voucher.create).not.toHaveBeenCalled()
      expect(tx.journalEntry.create).not.toHaveBeenCalled()
    })

    it.each([
      ["SUBMITTED", ManualJournalEntryErrorCodes.NOT_DRAFT],
      ["CONFIRMED", ManualJournalEntryErrorCodes.NOT_DRAFT],
      ["POSTED", ManualJournalEntryErrorCodes.IMMUTABLE_ENTRY],
      ["CANCELLED", ManualJournalEntryErrorCodes.IMMUTABLE_ENTRY],
    ] as const)("rejects delete when status is %s", async (status, code) => {
      const { tx, seedEntry } = createManualJournalMockTx(defaultAccounts)
      seedEntry(draftEntry({ id: "locked-entry", status }))

      await expect(
        deleteDraftManualJournalEntry({
          tx: tx as never,
          entryId: "locked-entry",
          legalEntityCode: entityAs,
        })
      ).rejects.toMatchObject({ code })
    })
  })

  describe("assertCanSubmitManualJournalEntry", () => {
    it("allows balanced two-line DRAFT", async () => {
      const { tx, seedEntry } = createManualJournalMockTx(defaultAccounts)
      const lineRows = balancedDraftLines()
      const entry = draftEntry({ id: "entry-seed", status: "DRAFT" })
      seedEntry(entry, lineRows)

      await expect(
        assertCanSubmitManualJournalEntry(tx as never, {
          ...entry,
          lines: lineRows.map((line) => ({
            id: line.id,
            manualJournalEntryId: line.manualJournalEntryId,
            lineNo: line.lineNo,
            glAccountId: line.glAccountId,
            debit: line.debit,
            credit: line.credit,
            memo: line.memo,
          })),
        })
      ).resolves.toBeUndefined()
    })
  })
})
