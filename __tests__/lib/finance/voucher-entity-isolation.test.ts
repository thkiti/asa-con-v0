import {
  ManualJournalEntryErrorCodes,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-errors"
import {
  getManualJournalEntryById,
  listManualJournalEntries,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-read"

const asEntry = {
  id: "mjv-as",
  entryNo: "MJV-260001",
  entryType: "MANUAL" as const,
  status: "POSTED" as const,
  branchId: "branch-1",
  legalEntityCode: "AS",
  entryDate: new Date("2026-06-01"),
  description: "ASAS entry",
  refNo: null,
  createdByStaffId: "staff-1",
  submittedAt: null,
  submittedByStaffId: null,
  confirmedAt: null,
  confirmedByStaffId: null,
  postedAt: new Date("2026-06-02"),
  postedByStaffId: "staff-1",
  cancelledAt: null,
  cancelledByStaffId: null,
  cancelReason: null,
  postedVoucherId: "v-1",
  postedJournalEntryId: "j-1",
  reversalJournalEntryId: null,
  pdfPath: "manual-journal/mjv-as.pdf",
  pdfBlobUrl: null,
  pdfGeneratedAt: new Date("2026-06-02"),
  createdAt: new Date("2026-06-01"),
  updatedAt: new Date("2026-06-02"),
  _count: { lines: 2 },
}

describe("finance voucher entity isolation", () => {
  it("AS list does not include AD vouchers", async () => {
    const findMany = jest.fn().mockResolvedValue([asEntry])
    const count = jest.fn().mockResolvedValue(1)
    const prisma = { manualJournalEntry: { findMany, count } }

    await listManualJournalEntries(prisma, { legalEntityCode: "AS" })

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ legalEntityCode: "AS" }),
      })
    )
  })

  it("AS cannot open AD voucher detail by id", async () => {
    const findFirst = jest.fn().mockResolvedValue(null)
    const prisma = {
      manualJournalEntry: {
        findFirst,
      },
    }

    await expect(
      getManualJournalEntryById(prisma, "mjv-ad", "AS")
    ).rejects.toMatchObject({
      code: ManualJournalEntryErrorCodes.ENTRY_NOT_FOUND,
    })

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "mjv-ad", legalEntityCode: "AS" },
      })
    )
  })

  it("AD can view its own voucher", async () => {
    const adEntry = {
      ...asEntry,
      id: "mjv-ad",
      entryNo: "MJV-260005",
      legalEntityCode: "AD",
      lines: [],
    }
    const findFirst = jest.fn().mockResolvedValue({
      ...adEntry,
      lines: [
        {
          id: "line-1",
          lineNo: 1,
          glAccountId: "acc-1",
          debit: { toString: () => "100" },
          credit: { toString: () => "0" },
          memo: null,
          glAccount: { code: "1100", name: "Cash" },
        },
        {
          id: "line-2",
          lineNo: 2,
          glAccountId: "acc-2",
          debit: { toString: () => "0" },
          credit: { toString: () => "100" },
          memo: null,
          glAccount: { code: "5000", name: "Expense" },
        },
      ],
    })
    const prisma = { manualJournalEntry: { findFirst } }

    const result = await getManualJournalEntryById(prisma, "mjv-ad", "AD")

    expect(result.legalEntityCode).toBe("AD")
    expect(result.entryNo).toBe("MJV-260005")
  })

  it("list requires legalEntityCode", async () => {
    const prisma = {
      manualJournalEntry: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    }

    await expect(listManualJournalEntries(prisma, {})).rejects.toMatchObject({
      code: ManualJournalEntryErrorCodes.INVALID_LINE,
    })
  })
})
