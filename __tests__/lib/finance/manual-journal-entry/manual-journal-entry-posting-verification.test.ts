import { GlAccountType, Prisma } from "@/generated/prisma/client"
import {
  ManualJournalEntryErrorCodes,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-errors"
import { getManualJournalEntryPostingVerification } from "@/lib/finance/manual-journal-entry/manual-journal-entry-posting-verification"

jest.mock("@/lib/finance/reports/trial-balance", () => ({
  getTrialBalance: jest.fn().mockResolvedValue({
    isBalanced: true,
    totalDebit: "100.00",
    totalCredit: "100.00",
  }),
}))

jest.mock("@/lib/finance/reports/general-ledger", () => ({
  getGeneralLedger: jest.fn().mockResolvedValue({
    filter: { legalEntityCode: "AS", periodKey: "2026-01" },
    accounts: [
      {
        accountCode: "1100",
        accountName: "Cash",
        accountType: GlAccountType.ASSET,
        openingDebit: "0",
        openingCredit: "0",
        openingBalance: "0",
        closingBalance: "100",
        transactions: [
          {
            journalEntryId: "journal-1",
            journalLineId: "jl-1",
            journalDate: "2026-01-01T00:00:00.000Z",
            entryNo: "V-2026-01-001",
            sourceRef: "OPB-260001",
            description: null,
            lineMemo: null,
            debit: "100",
            credit: "0",
            signedMovement: "100",
            runningBalance: "100",
          },
        ],
      },
      {
        accountCode: "301",
        accountName: "Retained earnings",
        accountType: GlAccountType.EQUITY,
        openingDebit: "0",
        openingCredit: "0",
        openingBalance: "0",
        closingBalance: "-100",
        transactions: [
          {
            journalEntryId: "journal-1",
            journalLineId: "jl-2",
            journalDate: "2026-01-01T00:00:00.000Z",
            entryNo: "V-2026-01-001",
            sourceRef: "OPB-260001",
            description: null,
            lineMemo: null,
            debit: "0",
            credit: "100",
            signedMovement: "100",
            runningBalance: "100",
          },
        ],
      },
    ],
  }),
}))

describe("getManualJournalEntryPostingVerification", () => {
  const prisma = {
    manualJournalEntry: {
      findUnique: jest.fn(),
    },
    journalEntry: {
      findUnique: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns verification for posted OPENING_BALANCE", async () => {
    prisma.manualJournalEntry.findUnique.mockResolvedValue({
      id: "opb-1",
      entryNo: "OPB-260001",
      entryType: "OPENING_BALANCE",
      status: "POSTED",
      branchId: "branch-1",
      legalEntityCode: "ASAD",
      entryDate: new Date("2026-01-01T00:00:00.000Z"),
      postedJournalEntryId: "journal-1",
      postedVoucherId: "voucher-1",
      lines: [
        {
          lineNo: 1,
          debit: new Prisma.Decimal(100),
          credit: new Prisma.Decimal(0),
          glAccount: { code: "1100", name: "Cash" },
        },
        {
          lineNo: 2,
          debit: new Prisma.Decimal(0),
          credit: new Prisma.Decimal(100),
          glAccount: { code: "301", name: "Retained earnings" },
        },
      ],
    })

    prisma.journalEntry.findUnique.mockResolvedValue({
      id: "journal-1",
      lines: [
        { lineNo: 1, debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0) },
        { lineNo: 2, debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(100) },
      ],
      voucher: { refNo: "OPB-260001" },
    })

    const result = await getManualJournalEntryPostingVerification(
      prisma as never,
      "opb-1"
    )

    expect(result.entryNo).toBe("OPB-260001")
    expect(result.periodKey).toBe("2026-01")
    expect(result.totalsMatch).toBe(true)
    expect(result.trialBalanceBalanced).toBe(true)
    expect(result.accountChecks).toHaveLength(2)
    expect(result.accountChecks[0]?.sourceRefMatches).toBe(true)
  })

  it("rejects non-OPENING_BALANCE entries", async () => {
    prisma.manualJournalEntry.findUnique.mockResolvedValue({
      id: "maj-1",
      entryType: "MANUAL",
      status: "POSTED",
      postedJournalEntryId: "journal-1",
      lines: [],
    })

    await expect(
      getManualJournalEntryPostingVerification(prisma as never, "maj-1")
    ).rejects.toMatchObject({
      code: ManualJournalEntryErrorCodes.INVALID_LINE,
    })
  })

  it("rejects unposted entries", async () => {
    prisma.manualJournalEntry.findUnique.mockResolvedValue({
      id: "opb-draft",
      entryType: "OPENING_BALANCE",
      status: "DRAFT",
      postedJournalEntryId: null,
      lines: [],
    })

    await expect(
      getManualJournalEntryPostingVerification(prisma as never, "opb-draft")
    ).rejects.toMatchObject({
      code: ManualJournalEntryErrorCodes.INVALID_TRANSITION,
    })
  })
})
