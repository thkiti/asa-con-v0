import { resolveManualJournalEntrySnapshotBranchLabel } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-branch"
import type { ManualJournalEntryPdfSnapshot } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-snapshot-types"

const snapshotBase: ManualJournalEntryPdfSnapshot = {
  snapshotVersion: 1,
  entryId: "entry-1",
  entryNo: "MJV-260001",
  entryType: "MANUAL",
  entryTypeLabel: "Manual Journal Voucher",
  branchId: "4778631f-a86c-45c4-82cf-09520087ee1a",
  branchCode: null,
  branchName: null,
  legalEntityCode: "AS",
  entryDate: "2026-06-14",
  description: "Test",
  refNo: null,
  createdAt: "2026-06-14T08:00:00.000Z",
  submittedAt: null,
  confirmedAt: null,
  postedAt: "2026-06-15T10:00:00.000Z",
  createdByStaffId: "staff-prep",
  submittedByStaffId: null,
  confirmedByStaffId: null,
  postedByStaffId: "staff-post",
  postedVoucherId: "voucher-1",
  postedVoucherNo: "V-001",
  postedJournalEntryId: "journal-1",
  lines: [],
  totalDebit: "0",
  totalCredit: "0",
}

describe("resolveManualJournalEntrySnapshotBranchLabel", () => {
  it("uses stored branchCode/branchName when present", async () => {
    const label = await resolveManualJournalEntrySnapshotBranchLabel(
      { branch: { findUnique: jest.fn() } },
      {
        ...snapshotBase,
        branchCode: "HO999",
        branchName: "Head Office",
      }
    )

    expect(label).toBe("HO999 • Head Office")
  })

  it("looks up branch by id when snapshot lacks code/name", async () => {
    const findUnique = jest.fn().mockResolvedValue({
      code: "HO999",
      name: "Head Office",
    })

    const label = await resolveManualJournalEntrySnapshotBranchLabel(
      { branch: { findUnique } },
      snapshotBase
    )

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: snapshotBase.branchId },
      select: { code: true, name: true },
    })
    expect(label).toBe("HO999 • Head Office")
  })

  it("returns em dash when branch cannot be resolved", async () => {
    const label = await resolveManualJournalEntrySnapshotBranchLabel(
      { branch: { findUnique: jest.fn().mockResolvedValue(null) } },
      snapshotBase
    )

    expect(label).toBe("—")
  })

  it("ignores UUID stored as branchCode and falls back to DB lookup", async () => {
    const findUnique = jest.fn().mockResolvedValue({
      code: "HO999",
      name: "Head Office",
    })

    const label = await resolveManualJournalEntrySnapshotBranchLabel(
      { branch: { findUnique } },
      {
        ...snapshotBase,
        branchCode: snapshotBase.branchId,
        branchName: null,
      }
    )

    expect(findUnique).toHaveBeenCalled()
    expect(label).toBe("HO999 • Head Office")
    expect(label).not.toContain(snapshotBase.branchId)
  })
})
