import { GlAccountType, Prisma } from "@/generated/prisma/client"
import {
  ManualJournalEntryErrorCodes,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-errors"
import { assertOpeningBalanceEntryRules } from "@/lib/finance/manual-journal-entry/manual-journal-entry-opening-balance-rules"
import { draftEntry, balancedDraftLines } from "./mock-manual-journal-tx"

describe("manual-journal-entry-opening-balance-rules", () => {
  const assetAccount = {
    id: "acc-asset",
    code: "1100",
    accountType: GlAccountType.ASSET,
  }
  const revenueAccount = {
    id: "acc-revenue",
    code: "5001",
    accountType: GlAccountType.REVENUE,
  }

  function buildTx(options: {
    accounts?: Array<{ id: string; code: string; accountType: GlAccountType }>
    duplicatePosted?: { id: string; entryNo: string } | null
  } = {}) {
    const accounts = options.accounts ?? [assetAccount, revenueAccount]
    return {
      glAccount: {
        findMany: jest.fn(async () => accounts),
      },
      manualJournalEntry: {
        findFirst: jest.fn(async () => options.duplicatePosted ?? null),
      },
    }
  }

  it("skips rules for MANUAL entries", async () => {
    const tx = buildTx()
    const entry = draftEntry({
      id: "entry-manual",
      status: "DRAFT",
      entryType: "MANUAL",
      lines: balancedDraftLines().map((line, index) => ({
        id: line.id,
        manualJournalEntryId: line.manualJournalEntryId,
        lineNo: index + 1,
        glAccountId: line.glAccountId,
        debit: line.debit,
        credit: line.credit,
        memo: line.memo,
      })),
    })

    await expect(assertOpeningBalanceEntryRules(tx, entry)).resolves.toBeUndefined()
    expect(tx.glAccount.findMany).not.toHaveBeenCalled()
  })

  it("rejects revenue or expense accounts on OPENING_BALANCE", async () => {
    const tx = buildTx()
    const lines = balancedDraftLines()
    const entry = draftEntry({
      id: "entry-opb",
      status: "DRAFT",
      entryType: "OPENING_BALANCE",
      lines: lines.map((line, index) => ({
        id: line.id,
        manualJournalEntryId: line.manualJournalEntryId,
        lineNo: index + 1,
        glAccountId: index === 0 ? "acc-asset" : "acc-revenue",
        debit: line.debit,
        credit: line.credit,
        memo: line.memo,
      })),
    })

    await expect(assertOpeningBalanceEntryRules(tx, entry)).rejects.toMatchObject({
      code: ManualJournalEntryErrorCodes.OPB_PL_ACCOUNT_NOT_ALLOWED,
    })
  })

  it("allows balance-sheet accounts on OPENING_BALANCE", async () => {
    const equityAccount = {
      id: "acc-equity",
      code: "301",
      accountType: GlAccountType.EQUITY,
    }
    const tx = buildTx({ accounts: [assetAccount, equityAccount] })
    const entry = draftEntry({
      id: "entry-opb",
      status: "CONFIRMED",
      entryType: "OPENING_BALANCE",
      entryDate: new Date("2026-01-01"),
      lines: [
        {
          id: "line-1",
          manualJournalEntryId: "entry-opb",
          lineNo: 1,
          glAccountId: "acc-asset",
          debit: new Prisma.Decimal(100),
          credit: new Prisma.Decimal(0),
          memo: null,
        },
        {
          id: "line-2",
          manualJournalEntryId: "entry-opb",
          lineNo: 2,
          glAccountId: "acc-equity",
          debit: new Prisma.Decimal(0),
          credit: new Prisma.Decimal(100),
          memo: null,
        },
      ],
    })

    await expect(assertOpeningBalanceEntryRules(tx, entry)).resolves.toBeUndefined()
  })

  it("blocks post when duplicate posted OPB exists for same entity and date", async () => {
    const equityAccount = {
      id: "acc-equity",
      code: "301",
      accountType: GlAccountType.EQUITY,
    }
    const tx = buildTx({
      accounts: [assetAccount, equityAccount],
      duplicatePosted: { id: "other", entryNo: "OPB-260001" },
    })
    const entry = draftEntry({
      id: "entry-opb-2",
      status: "CONFIRMED",
      entryType: "OPENING_BALANCE",
      legalEntityCode: "ASAD",
      entryDate: new Date("2026-01-01T12:00:00.000Z"),
      lines: [
        {
          id: "line-1",
          manualJournalEntryId: "entry-opb-2",
          lineNo: 1,
          glAccountId: "acc-asset",
          debit: new Prisma.Decimal(50),
          credit: new Prisma.Decimal(0),
          memo: null,
        },
        {
          id: "line-2",
          manualJournalEntryId: "entry-opb-2",
          lineNo: 2,
          glAccountId: "acc-equity",
          debit: new Prisma.Decimal(0),
          credit: new Prisma.Decimal(50),
          memo: null,
        },
      ],
    })

    await expect(assertOpeningBalanceEntryRules(tx, entry)).rejects.toMatchObject({
      code: ManualJournalEntryErrorCodes.OPB_DUPLICATE_POSTED,
    })
  })
})
