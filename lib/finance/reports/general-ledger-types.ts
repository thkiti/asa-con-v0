import type { GlAccountType } from "@/generated/prisma/client"

import type { BranchScopedReportFilter } from "./report-filter"

export type GeneralLedgerFilter = BranchScopedReportFilter & {
  periodKey?: string
  from?: string
  to?: string
  accountId?: string
  accountIds?: string[]
  accountCode?: string
  accountCodes?: string[]
}

export type GeneralLedgerTransaction = {
  journalEntryId: string
  journalLineId: string
  journalDate: string
  entryNo: string
  sourceRef: string | null
  description: string | null
  lineMemo: string | null
  debit: string
  credit: string
  signedMovement: string
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
