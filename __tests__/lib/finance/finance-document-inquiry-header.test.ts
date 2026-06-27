import { resolveFinanceDocumentHeaderContext } from "@/lib/finance/finance-document-inquiry-header"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"

describe("resolveFinanceDocumentHeaderContext", () => {
  const prisma = {
    manualJournalEntry: {
      findFirst: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("builds header from linked manual journal entry scoped by entity", async () => {
    prisma.manualJournalEntry.findFirst.mockResolvedValue({
      entryNo: "OPB-260001",
      entryType: "OPENING_BALANCE",
      entryDate: new Date("2026-01-01T00:00:00.000Z"),
      legalEntityCode: "AD",
      description: "OPENING BALANCE 2026",
      status: "POSTED",
      createdAt: new Date("2026-06-14T08:00:00.000Z"),
      submittedAt: new Date("2026-06-14T09:00:00.000Z"),
      confirmedAt: new Date("2026-06-14T10:00:00.000Z"),
      postedAt: new Date("2026-06-18T09:59:00.000Z"),
      cancelledAt: null,
    })

    const header = await resolveFinanceDocumentHeaderContext(prisma as never, {
      legalEntityCode: "AD",
      refType: FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL,
      refId: "entry-1",
      refNo: "OPB-260001",
      entryDate: "2026-01-01T00:00:00.000Z",
      description: "OPENING BALANCE 2026",
      postedAt: "2026-06-18T09:59:00.000Z",
    })

    expect(prisma.manualJournalEntry.findFirst).toHaveBeenCalledWith({
      where: { id: "entry-1", legalEntityCode: "AD" },
      select: expect.any(Object),
    })
    expect(header).toEqual({
      legalEntityCode: "AD",
      entryType: "OPENING_BALANCE",
      documentNo: "OPB-260001",
      entryDate: "2026-01-01T00:00:00.000Z",
      status: "POSTED",
      description: "OPENING BALANCE 2026",
      createdAt: "2026-06-14T08:00:00.000Z",
      submittedAt: "2026-06-14T09:00:00.000Z",
      confirmedAt: "2026-06-14T10:00:00.000Z",
      postedAt: "2026-06-18T09:59:00.000Z",
      cancelledAt: null,
    })
  })

  it("falls back to refNo when manual journal entry is not found for entity", async () => {
    prisma.manualJournalEntry.findFirst.mockResolvedValue(null)

    const header = await resolveFinanceDocumentHeaderContext(prisma as never, {
      legalEntityCode: "AS",
      refType: FINANCE_REF_TYPES.MANUAL_JOURNAL,
      refId: "missing-entry",
      refNo: "MJV-260001",
      entryDate: "2026-06-14T00:00:00.000Z",
      description: "Adjustment",
      postedAt: "2026-06-14T15:00:00.000Z",
    })

    expect(header).toMatchObject({
      legalEntityCode: "AS",
      entryType: "MANUAL",
      documentNo: "MJV-260001",
      status: "POSTED",
      description: "Adjustment",
    })
  })

  it("returns null for non-operational ref types", async () => {
    const header = await resolveFinanceDocumentHeaderContext(prisma as never, {
      legalEntityCode: "AS",
      refType: FINANCE_REF_TYPES.POS_SALE,
      refId: "sale-1",
      refNo: null,
      entryDate: "2026-06-14T00:00:00.000Z",
      description: null,
      postedAt: "2026-06-14T15:00:00.000Z",
    })

    expect(header).toBeNull()
    expect(prisma.manualJournalEntry.findFirst).not.toHaveBeenCalled()
  })
})
