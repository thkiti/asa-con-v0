import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import type { BankAccountRow } from "../bank-account"

export type BankCashJournalLine = {
  journalEntryId: string
  journalLineId: string
  journalDate: string
  entryNo: string
  sourceRef: string | null
  sourceRefType: string | null
  description: string | null
  lineMemo: string | null
  depositAmount: string
  withdrawalAmount: string
  runningBalance: string
}

export type BankCashJournalResult = {
  legalEntityCode: DocumentEntityCode
  periodKey: string
  bankAccount: BankAccountRow
  beginningBalance: string
  endingBalance: string
  lines: BankCashJournalLine[]
}

export type BankCashJournalFilter = {
  legalEntityCode: DocumentEntityCode
  periodKey: string
  bankAccountId: string
  branchId?: string
}
