import type { AccountingPeriodStatus } from "@/generated/prisma/client"

export type OpeningBalanceReviewStatus = "READY" | "BLOCKED"

export type OpeningBalanceReviewItemId =
  | "ob-journal-exists"
  | "ob-journal-posted"
  | "trial-balance-balanced"
  | "debit-equals-credit"
  | "chart-of-accounts-available"
  | "accounting-period-exists"

export type OpeningBalanceReviewItem = {
  id: OpeningBalanceReviewItemId
  passed: boolean
  title: string
  detail: string
}

export type OpeningBalanceReviewPeriod = {
  id: string
  legalEntityCode: string
  branchId: string
  periodKey: string
  status: AccountingPeriodStatus
  closedAt: string | null
}

export type OpeningBalanceReviewJournalRef = {
  id: string | null
  entryNo: string | null
  status: string | null
  postedAt: string | null
  postedJournalEntryId: string | null
  postedVoucherId: string | null
  voucherNo: string | null
}

export type OpeningBalanceReviewTrialBalance = {
  isBalanced: boolean | null
  totalDebit: string | null
  totalCredit: string | null
}

export type OpeningBalanceReviewResult = {
  status: OpeningBalanceReviewStatus
  blockerCount: number
  items: OpeningBalanceReviewItem[]
  period: OpeningBalanceReviewPeriod
  openingJournal: OpeningBalanceReviewJournalRef
  trialBalance: OpeningBalanceReviewTrialBalance
}
