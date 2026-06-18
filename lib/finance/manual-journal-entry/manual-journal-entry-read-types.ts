import type {
  ManualJournalEntryStatus,
  ManualJournalEntryType,
} from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"

export type ManualJournalEntryListFilter = {
  legalEntityCode?: DocumentEntityCode
  status?: ManualJournalEntryStatus
  entryType?: ManualJournalEntryType
  branchId?: string
  dateFrom?: Date | string
  dateTo?: Date | string
  limit?: number
  offset?: number
}

export type ManualJournalEntryLineRead = {
  id: string
  lineNo: number
  glAccountId: string
  accountCode: string
  accountName: string
  debit: string
  credit: string
  memo: string | null
}

export type ManualJournalEntryRead = {
  id: string
  entryNo: string
  entryType: ManualJournalEntryType
  status: ManualJournalEntryStatus
  branchId: string
  legalEntityCode: string
  entryDate: string
  description: string | null
  refNo: string | null
  createdByStaffId: string
  submittedAt: string | null
  submittedByStaffId: string | null
  confirmedAt: string | null
  confirmedByStaffId: string | null
  postedAt: string | null
  postedByStaffId: string | null
  cancelledAt: string | null
  cancelledByStaffId: string | null
  cancelReason: string | null
  postedVoucherId: string | null
  postedJournalEntryId: string | null
  reversalJournalEntryId: string | null
  pdfPath: string | null
  pdfBlobUrl: string | null
  pdfGeneratedAt: string | null
  pdfSnapshotReady: boolean
  createdAt: string
  updatedAt: string
  lines: ManualJournalEntryLineRead[]
}

export type ManualJournalEntryListItem = Omit<ManualJournalEntryRead, "lines"> & {
  lineCount: number
}

export type ManualJournalEntryListResult = {
  entries: ManualJournalEntryListItem[]
  total: number
}
