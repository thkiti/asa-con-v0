import type {
  ManualJournalEntry,
  ManualJournalEntryLine,
  ManualJournalEntryStatus,
  ManualJournalEntryType,
  Prisma,
} from "@/generated/prisma/client"

export type ManualJournalEntryWithLines = ManualJournalEntry & {
  lines: ManualJournalEntryLine[]
}

export type ManualJournalWorkflowAction = "SUBMIT" | "CONFIRM" | "POST" | "CANCEL"

export type ManualJournalTransitionContext = {
  fromStatus: ManualJournalEntryStatus
  action: ManualJournalWorkflowAction
}

/** Staff identity for workflow audit fields (Staff.id or business staffId per caller). */
export type ManualJournalEntryActorRef = {
  staffId: string
}

export type ManualJournalSaveLineInput = {
  accountCode?: string
  glAccountId?: string
  debit: number | string
  credit: number | string
  memo?: string | null
}

export type ResolvedManualJournalLine = {
  lineNo: number
  glAccountId: string
  debit: Prisma.Decimal
  credit: Prisma.Decimal
  memo: string | null
}

export type CreateManualJournalEntryDraftInput = {
  branchId: string
  legalEntityCode: string
  entryDate: Date | string
  entryType: ManualJournalEntryType
  description?: string | null
  refNo?: string | null
  createdByStaffId: string
  lines: ManualJournalSaveLineInput[]
  tx?: Prisma.TransactionClient
}

export type UpdateManualJournalEntryDraftInput = {
  entryId: string
  entryDate?: Date | string
  description?: string | null
  refNo?: string | null
  lines: ManualJournalSaveLineInput[]
  tx?: Prisma.TransactionClient
}

export type DeleteDraftManualJournalEntryInput = {
  entryId: string
  tx?: Prisma.TransactionClient
}

export type SubmitManualJournalEntryInput = {
  entryId: string
  submittedByStaffId: string
  tx?: Prisma.TransactionClient
}

export type ConfirmManualJournalEntryInput = {
  entryId: string
  confirmedByStaffId: string
  tx?: Prisma.TransactionClient
}

export type CancelManualJournalEntryInput = {
  entryId: string
  cancelledByStaffId: string
  cancelReason?: string | null
  tx?: Prisma.TransactionClient
}

export type PostManualJournalEntryInput = {
  entryId: string
  postedByStaffId: string
  tx?: Prisma.TransactionClient
}

export type ApplySubmittedStatusInput = {
  entryId: string
  submittedByStaffId: string
}

export type ApplyConfirmedStatusInput = {
  entryId: string
  confirmedByStaffId: string
}

export type ApplyPostedStatusInput = {
  entryId: string
  postedByStaffId: string
  postedVoucherId?: string | null
  postedJournalEntryId?: string | null
}

export type ApplyPdfSnapshotInput = {
  entryId: string
  pdfPath: string
  pdfGeneratedAt: Date
  pdfBlobUrl?: string | null
}

export type ApplyCancelledStatusInput = {
  entryId: string
  cancelledByStaffId: string
  cancelReason?: string | null
}

export type AllocateManualJournalEntryNoInput = {
  legalEntityCode: string
  entryType: ManualJournalEntry["entryType"]
  entryDate: Date
}

export type ManualJournalEntryDb = Pick<
  Prisma.TransactionClient,
  "manualJournalEntry"
>
