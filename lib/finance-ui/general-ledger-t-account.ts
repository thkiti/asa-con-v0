import type { GeneralLedgerAccount, GeneralLedgerTransaction } from "@/lib/finance-ui/types"

export type GeneralLedgerTAccountSideRow = {
  journalEntryId: string
  journalLineId: string
  journalDate: string
  entryNo: string
  sourceRef: string | null
  sourceRefType: string | null
  sourceRefId: string | null
  voucherId: string | null
  description: string | null
  lineMemo: string | null
  amount: string
}

export type GeneralLedgerTAccountSplit = {
  debitRows: GeneralLedgerTAccountSideRow[]
  creditRows: GeneralLedgerTAccountSideRow[]
}

function hasPositiveAmount(value: string): boolean {
  const num = Number(String(value ?? "").trim() || "0")
  return !Number.isNaN(num) && num !== 0
}

function toSideRow(
  tx: GeneralLedgerTransaction,
  side: "debit" | "credit"
): GeneralLedgerTAccountSideRow {
  return {
    journalEntryId: tx.journalEntryId,
    journalLineId: tx.journalLineId,
    journalDate: tx.journalDate,
    entryNo: tx.entryNo,
    sourceRef: tx.sourceRef,
    sourceRefType: tx.sourceRefType,
    sourceRefId: tx.sourceRefId,
    voucherId: tx.voucherId,
    description: tx.description,
    lineMemo: tx.lineMemo,
    amount: tx[side],
  }
}

export function splitGeneralLedgerTAccountRows(
  transactions: GeneralLedgerTransaction[]
): GeneralLedgerTAccountSplit {
  const debitRows: GeneralLedgerTAccountSideRow[] = []
  const creditRows: GeneralLedgerTAccountSideRow[] = []

  for (const tx of transactions) {
    if (hasPositiveAmount(tx.debit)) {
      debitRows.push(toSideRow(tx, "debit"))
    }
    if (hasPositiveAmount(tx.credit)) {
      creditRows.push(toSideRow(tx, "credit"))
    }
  }

  return { debitRows, creditRows }
}

export function sumGeneralLedgerTransactionDebits(
  transactions: GeneralLedgerTransaction[]
): number {
  return transactions.reduce((sum, tx) => sum + Number(tx.debit || 0), 0)
}

export function sumGeneralLedgerTransactionCredits(
  transactions: GeneralLedgerTransaction[]
): number {
  return transactions.reduce((sum, tx) => sum + Number(tx.credit || 0), 0)
}

export function generalLedgerTAccountTotals(account: GeneralLedgerAccount) {
  return {
    openingBalance: account.openingBalance,
    totalDebit: sumGeneralLedgerTransactionDebits(account.transactions),
    totalCredit: sumGeneralLedgerTransactionCredits(account.transactions),
    closingBalance: account.closingBalance,
  }
}
