import type { AccountingPeriodStatus } from "@/generated/prisma/client"

export const CLOSING_ENTRY_LINE_REASONS = {
  CLOSE_REVENUE: "CLOSE_REVENUE",
  CLOSE_EXPENSE: "CLOSE_EXPENSE",
  TRANSFER_NET_INCOME_TO_RE: "TRANSFER_NET_INCOME_TO_RE",
  TRANSFER_NET_LOSS_TO_RE: "TRANSFER_NET_LOSS_TO_RE",
} as const

export type ClosingEntryLineReason =
  (typeof CLOSING_ENTRY_LINE_REASONS)[keyof typeof CLOSING_ENTRY_LINE_REASONS]

export type ClosingEntrySourceRow = {
  accountCode: string
  accountName: string
  signedAmount: string
}

export type BuildClosingEntryLinesInput = {
  periodKey?: string
  revenue: ClosingEntrySourceRow[]
  expenses: ClosingEntrySourceRow[]
  retainedEarningsAccountCode?: string
  retainedEarningsAccountName?: string
}

export type ClosingEntryLine = {
  accountCode: string
  accountName: string
  debit: string
  credit: string
  reason: ClosingEntryLineReason
}

export type BuildClosingEntryLinesResult = {
  periodKey?: string
  lines: ClosingEntryLine[]
  totalDebit: string
  totalCredit: string
  netIncome: string
  isBalanced: boolean
  isRequired: boolean
  retainedEarningsAccountCode: string
}

export type ClosingEntryStatus = {
  voucherId: string
  voucherNo: string
  journalEntryId: string
  refId: string
  netIncome: string
  lineCount: number
  postedAt: string
  isActive: boolean
  isReversed: boolean
  reversedByJournalId: string | null
}

export type PostClosingEntryResult = {
  posted: boolean
  reason?: "NOT_REQUIRED"
  voucherId?: string
  voucherNo?: string
  journalEntryId?: string
  netIncome: string
  lineCount: number
  alreadyPosted: boolean
}

export type PreviewClosingEntryResult = {
  periodKey: string
  branchId: string
  periodId: string
  periodStatus: AccountingPeriodStatus
  simulation: BuildClosingEntryLinesResult
  activeEntry: ClosingEntryStatus | null
  canPost: boolean
}
