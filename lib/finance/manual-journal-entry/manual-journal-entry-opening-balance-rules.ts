import { GlAccountType, type Prisma } from "@/generated/prisma/client"
import {
  ManualJournalEntryError,
  ManualJournalEntryErrorCodes,
} from "./manual-journal-entry-errors"
import type { ManualJournalEntryWithLines } from "./manual-journal-entry-types"

const PL_ACCOUNT_TYPES = new Set<GlAccountType>([
  GlAccountType.REVENUE,
  GlAccountType.EXPENSE,
])

function utcDayRange(entryDate: Date): { gte: Date; lt: Date } {
  const gte = new Date(entryDate)
  gte.setUTCHours(0, 0, 0, 0)
  const lt = new Date(gte)
  lt.setUTCDate(lt.getUTCDate() + 1)
  return { gte, lt }
}

async function assertOpeningBalanceAccountsOnly(
  tx: Pick<Prisma.TransactionClient, "glAccount">,
  entry: ManualJournalEntryWithLines
): Promise<void> {
  const sortedLines = [...entry.lines].sort((a, b) => a.lineNo - b.lineNo)
  const accountIds = [...new Set(sortedLines.map((line) => line.glAccountId))]

  const accounts = await tx.glAccount.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, code: true, accountType: true },
  })
  const byId = new Map(accounts.map((account) => [account.id, account]))

  for (const line of sortedLines) {
    const account = byId.get(line.glAccountId)
    if (!account) continue
    if (PL_ACCOUNT_TYPES.has(account.accountType)) {
      throw new ManualJournalEntryError(
        `Opening balance may not use revenue or expense accounts (line ${line.lineNo}: ${account.code})`,
        ManualJournalEntryErrorCodes.OPB_PL_ACCOUNT_NOT_ALLOWED
      )
    }
  }
}

async function assertNoDuplicatePostedOpeningBalance(
  tx: Pick<Prisma.TransactionClient, "manualJournalEntry">,
  entry: ManualJournalEntryWithLines
): Promise<void> {
  if (entry.status === "POSTED") return

  const { gte, lt } = utcDayRange(entry.entryDate)
  const duplicate = await tx.manualJournalEntry.findFirst({
    where: {
      id: { not: entry.id },
      entryType: "OPENING_BALANCE",
      status: "POSTED",
      legalEntityCode: entry.legalEntityCode,
      entryDate: { gte, lt },
    },
    select: { id: true, entryNo: true },
  })

  if (duplicate) {
    throw new ManualJournalEntryError(
      `A posted opening balance already exists for ${entry.legalEntityCode} on this date (${duplicate.entryNo})`,
      ManualJournalEntryErrorCodes.OPB_DUPLICATE_POSTED
    )
  }
}

/**
 * Opening-balance rules for submit/post — balance-sheet accounts only; one posted OPB per entity per day.
 */
export async function assertOpeningBalanceEntryRules(
  tx: Pick<Prisma.TransactionClient, "glAccount" | "manualJournalEntry">,
  entry: ManualJournalEntryWithLines
): Promise<void> {
  if (entry.entryType !== "OPENING_BALANCE") return

  await assertOpeningBalanceAccountsOnly(tx, entry)
  await assertNoDuplicatePostedOpeningBalance(tx, entry)
}
