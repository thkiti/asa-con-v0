import type { ManualJournalEntryType } from "@/generated/prisma/client"

export const MANUAL_JOURNAL_ENTRY_PDF_SNAPSHOT_VERSION = 1 as const

export type ManualJournalEntryPdfSnapshotLine = {
  lineNo: number
  accountCode: string
  accountName: string
  debit: string
  credit: string
  memo: string | null
}

/** Frozen POST-time payload — sole input for PDF render and storage. */
export type ManualJournalEntryPdfSnapshot = {
  snapshotVersion: typeof MANUAL_JOURNAL_ENTRY_PDF_SNAPSHOT_VERSION
  entryId: string
  entryNo: string
  entryType: ManualJournalEntryType
  entryTypeLabel: string
  branchId: string
  branchCode: string | null
  branchName: string | null
  legalEntityCode: string
  entryDate: string
  description: string | null
  refNo: string | null
  createdAt: string
  submittedAt: string | null
  confirmedAt: string | null
  postedAt: string
  createdByStaffId: string
  submittedByStaffId: string | null
  confirmedByStaffId: string | null
  postedByStaffId: string
  postedVoucherId: string
  postedVoucherNo: string
  postedJournalEntryId: string
  lines: ManualJournalEntryPdfSnapshotLine[]
  totalDebit: string
  totalCredit: string
}
