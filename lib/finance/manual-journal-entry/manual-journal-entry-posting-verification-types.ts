export type ManualJournalPostingVerificationAccountCheck = {
  accountCode: string
  accountName: string
  entryDebit: string
  entryCredit: string
  closingBalance: string
  sourceRefMatches: boolean
}

export type ManualJournalEntryPostingVerification = {
  entryId: string
  entryNo: string
  entryType: string
  status: string
  branchId: string
  legalEntityCode: string
  entryDate: string
  periodKey: string
  entryTotalDebit: string
  entryTotalCredit: string
  postedJournalEntryId: string | null
  postedVoucherId: string | null
  journalTotalDebit: string | null
  journalTotalCredit: string | null
  totalsMatch: boolean
  trialBalanceBalanced: boolean | null
  trialBalanceTotalDebit: string | null
  trialBalanceTotalCredit: string | null
  accountChecks: ManualJournalPostingVerificationAccountCheck[]
}
