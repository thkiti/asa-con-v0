import { Prisma } from "@/generated/prisma/client"
import { buildManualJournalEntryPdfSnapshot } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-snapshot"

describe("buildManualJournalEntryPdfSnapshot", () => {
  it("builds frozen totals and line labels from POST-time source", () => {
    const snapshot = buildManualJournalEntryPdfSnapshot(
      {
        id: "entry-1",
        entryNo: "MAJ-260001",
        entryType: "OPENING_BALANCE",
        branchId: "branch-1",
        legalEntityCode: "AS",
        entryDate: new Date("2026-06-14T00:00:00.000Z"),
        description: "Opening",
        refNo: "REF-1",
        postedAt: new Date("2026-06-15T10:00:00.000Z"),
        postedByStaffId: "staff-post",
        lines: [
          {
            lineNo: 2,
            debit: new Prisma.Decimal(0),
            credit: new Prisma.Decimal(100),
            memo: null,
            glAccount: { code: "5000", name: "Equity" },
          },
          {
            lineNo: 1,
            debit: new Prisma.Decimal(100),
            credit: new Prisma.Decimal(0),
            memo: "cash",
            glAccount: { code: "1100", name: "Cash" },
          },
        ],
      },
      {
        voucherId: "voucher-1",
        voucherNo: "V-001",
        journalEntryId: "journal-1",
      }
    )

    expect(snapshot.entryTypeLabel).toBe("Opening Balance Journal")
    expect(snapshot.lines.map((line) => line.lineNo)).toEqual([1, 2])
    expect(snapshot.totalDebit).toBe("100")
    expect(snapshot.totalCredit).toBe("100")
    expect(snapshot.postedVoucherNo).toBe("V-001")
    expect(snapshot.lines[0]?.memo).toBe("cash")
  })
})
