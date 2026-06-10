import type { GlAccountType } from "@/generated/prisma/client"

export type GeneralLedgerFilter = {
  branchId: string
  periodKey?: string
  from?: string
  to?: string
  accountCode?: string
  accountCodes?: string[]
}

export type GeneralLedgerTransaction = {
  journalEntryId: string
  journalDate: string
  entryNo: string
  description: string | null
  lineMemo: string | null
  debit: string
  credit: string
  runningBalance: string
}

export type GeneralLedgerAccount = {
  accountCode: string
  accountName: string
  accountType: GlAccountType
  openingDebit: string
  openingCredit: string
  openingBalance: string
  transactions: GeneralLedgerTransaction[]
  closingBalance: string
}

export type GeneralLedgerResult = {
  filter: GeneralLedgerFilter
  accounts: GeneralLedgerAccount[]
}
