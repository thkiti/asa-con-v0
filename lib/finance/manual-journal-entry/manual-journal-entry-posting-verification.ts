import { parseDocumentEntityCode } from "@/lib/legal-entity/document-entity"
import type { PrismaClient } from "@/generated/prisma/client"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"
import { getGeneralLedger } from "@/lib/finance/reports/general-ledger"
import { getTrialBalance } from "@/lib/finance/reports/trial-balance"
import {
  ManualJournalEntryError,
  ManualJournalEntryErrorCodes,
} from "./manual-journal-entry-errors"
import type { ManualJournalEntryPostingVerification } from "./manual-journal-entry-posting-verification-types"

export type ManualJournalPostingVerificationPrisma = Pick<
  PrismaClient,
  | "manualJournalEntry"
  | "journalEntry"
  | "journalEntryLine"
  | "glAccount"
  | "accountingPeriod"
>

function periodKeyFromDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

export async function getManualJournalEntryPostingVerification(
  prisma: ManualJournalPostingVerificationPrisma,
  entryId: string
): Promise<ManualJournalEntryPostingVerification> {
  const id = String(entryId ?? "").trim()
  if (!id) {
    throw new ManualJournalEntryError(
      "entryId is required",
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }

  const entry = await prisma.manualJournalEntry.findUnique({
    where: { id },
    include: {
      lines: {
        orderBy: { lineNo: "asc" },
        include: {
          glAccount: { select: { code: true, name: true } },
        },
      },
    },
  })

  if (!entry) {
    throw new ManualJournalEntryError(
      "Manual journal entry not found",
      ManualJournalEntryErrorCodes.ENTRY_NOT_FOUND,
      404
    )
  }

  if (entry.entryType !== "OPENING_BALANCE") {
    throw new ManualJournalEntryError(
      "Posting verification is only available for OPENING_BALANCE entries",
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }

  if (entry.status !== "POSTED" || !entry.postedJournalEntryId) {
    throw new ManualJournalEntryError(
      "Posting verification requires a posted entry with a linked journal",
      ManualJournalEntryErrorCodes.INVALID_TRANSITION,
      409
    )
  }

  let entryTotalDebit = ZERO
  let entryTotalCredit = ZERO
  for (const line of entry.lines) {
    entryTotalDebit = addMoney(entryTotalDebit, toMoney(line.debit))
    entryTotalCredit = addMoney(entryTotalCredit, toMoney(line.credit))
  }

  const journal = await prisma.journalEntry.findUnique({
    where: { id: entry.postedJournalEntryId },
    include: {
      lines: { orderBy: { lineNo: "asc" } },
      voucher: { select: { refNo: true } },
    },
  })

  let journalTotalDebit = ZERO
  let journalTotalCredit = ZERO
  if (journal) {
    for (const line of journal.lines) {
      journalTotalDebit = addMoney(journalTotalDebit, toMoney(line.debit))
      journalTotalCredit = addMoney(journalTotalCredit, toMoney(line.credit))
    }
  }

  const periodKey = periodKeyFromDate(entry.entryDate)
  const trialBalance = await getTrialBalance(prisma, {
    legalEntityCode: parseDocumentEntityCode(entry.legalEntityCode) ?? "AS",
    periodKey,
  })

  const accountCodes = entry.lines.map((line) => line.glAccount.code)
  const entityCode = parseDocumentEntityCode(entry.legalEntityCode) ?? "AS"
  const generalLedger = await getGeneralLedger(prisma, {
    legalEntityCode: entityCode,
    branchId: entry.branchId,
    periodKey,
    accountCodes,
  })
  const ledgerByCode = new Map(
    generalLedger.accounts.map((account) => [account.accountCode, account])
  )

  const accountChecks = entry.lines.map((line) => {
    const ledgerAccount = ledgerByCode.get(line.glAccount.code)
    const opbTransaction = ledgerAccount?.transactions.find(
      (tx) => tx.sourceRef === entry.entryNo
    )

    return {
      lineId: line.id,
      accountCode: line.glAccount.code,
      accountName: line.glAccount.name,
      entryDebit: toMoney(line.debit).toString(),
      entryCredit: toMoney(line.credit).toString(),
      closingBalance: ledgerAccount?.closingBalance ?? "0",
      sourceRefMatches: opbTransaction != null,
    }
  })

  return {
    entryId: entry.id,
    entryNo: entry.entryNo,
    entryType: entry.entryType,
    status: entry.status,
    branchId: entry.branchId,
    legalEntityCode: entry.legalEntityCode,
    entryDate: entry.entryDate.toISOString(),
    periodKey,
    entryTotalDebit: entryTotalDebit.toString(),
    entryTotalCredit: entryTotalCredit.toString(),
    postedJournalEntryId: entry.postedJournalEntryId,
    postedVoucherId: entry.postedVoucherId,
    journalTotalDebit: journal ? journalTotalDebit.toString() : null,
    journalTotalCredit: journal ? journalTotalCredit.toString() : null,
    totalsMatch:
      journal != null &&
      entryTotalDebit.equals(journalTotalDebit) &&
      entryTotalCredit.equals(journalTotalCredit),
    trialBalanceBalanced: trialBalance.isBalanced,
    trialBalanceTotalDebit: trialBalance.totalDebits,
    trialBalanceTotalCredit: trialBalance.totalCredits,
    accountChecks,
  }
}
