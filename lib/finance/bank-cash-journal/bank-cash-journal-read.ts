import type { PrismaClient } from "@/generated/prisma/client"
import { normalizeAccountingPeriodKey } from "../period-key"
import { getGeneralLedger } from "../reports/general-ledger"
import { getBankAccountById } from "../bank-account/bank-account-read"
import { BankAccountError, BankAccountErrorCodes } from "../bank-account/bank-account-errors"
import type {
  BankCashJournalFilter,
  BankCashJournalLine,
  BankCashJournalResult,
} from "./bank-cash-journal-types"

export class BankCashJournalError extends Error {
  readonly code: string
  readonly status: number

  constructor(message: string, code: string, status = 400) {
    super(message)
    this.name = "BankCashJournalError"
    this.code = code
    this.status = status
  }
}

export type BankCashJournalPrisma = Pick<
  PrismaClient,
  "bankAccount" | "glAccount" | "journalEntryLine" | "accountingPeriod"
>

function mapLedgerLineToJournalLine(input: {
  journalEntryId: string
  journalLineId: string
  journalDate: string
  entryNo: string
  sourceRef: string | null
  sourceRefType: string | null
  description: string | null
  lineMemo: string | null
  debit: string
  credit: string
  runningBalance: string
}): BankCashJournalLine {
  return {
    journalEntryId: input.journalEntryId,
    journalLineId: input.journalLineId,
    journalDate: input.journalDate,
    entryNo: input.entryNo,
    sourceRef: input.sourceRef,
    sourceRefType: input.sourceRefType,
    description: input.description,
    lineMemo: input.lineMemo,
    depositAmount: input.debit,
    withdrawalAmount: input.credit,
    runningBalance: input.runningBalance,
  }
}

export async function getBankCashJournal(
  prisma: BankCashJournalPrisma,
  filter: BankCashJournalFilter
): Promise<BankCashJournalResult> {
  const periodKey = normalizeAccountingPeriodKey(filter.periodKey)
  const bankAccountId = filter.bankAccountId.trim()

  if (!periodKey) {
    throw new BankCashJournalError(
      "periodKey must be YYYY-MM",
      "VALIDATION_ERROR"
    )
  }

  if (!bankAccountId) {
    throw new BankCashJournalError(
      "bankAccountId is required",
      "VALIDATION_ERROR"
    )
  }

  let bankAccount
  try {
    bankAccount = await getBankAccountById(prisma, {
      id: bankAccountId,
      legalEntityCode: filter.legalEntityCode,
    })
  } catch (err) {
    if (err instanceof BankAccountError && err.code === BankAccountErrorCodes.NOT_FOUND) {
      throw new BankCashJournalError(err.message, err.code, err.status)
    }
    throw err
  }

  const ledger = await getGeneralLedger(prisma, {
    legalEntityCode: filter.legalEntityCode,
    periodKey,
    accountId: bankAccount.glAccount.id,
    ...(filter.branchId ? { branchId: filter.branchId } : {}),
  })

  const account = ledger.accounts[0]
  if (!account) {
    return {
      legalEntityCode: filter.legalEntityCode,
      periodKey,
      bankAccount,
      beginningBalance: "0.00",
      endingBalance: "0.00",
      lines: [],
    }
  }

  // Period-scoped GL: openingBalance = prior posted balance (end of previous period);
  // closingBalance = opening + movements within the selected periodKey.
  const lines = account.transactions.map((tx) =>
    mapLedgerLineToJournalLine({
      journalEntryId: tx.journalEntryId,
      journalLineId: tx.journalLineId,
      journalDate: tx.journalDate,
      entryNo: tx.entryNo,
      sourceRef: tx.sourceRef,
      sourceRefType: tx.sourceRefType,
      description: tx.description,
      lineMemo: tx.lineMemo,
      debit: tx.debit,
      credit: tx.credit,
      runningBalance: tx.runningBalance,
    })
  )

  return {
    legalEntityCode: filter.legalEntityCode,
    periodKey,
    bankAccount,
    beginningBalance: account.openingBalance,
    endingBalance: account.closingBalance,
    lines,
  }
}
