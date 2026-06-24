import type {
  PettyCashVoucher,
  PettyCashVoucherLine,
  PettyCashVoucherStatus,
  Prisma,
} from "@/generated/prisma/client"

export type PettyCashVoucherWithLines = PettyCashVoucher & {
  lines: PettyCashVoucherLine[]
}

export type PettyCashVoucherWorkflowAction = "SUBMIT" | "CONFIRM" | "POST" | "CANCEL"

export type PettyCashVoucherTransitionContext = {
  fromStatus: PettyCashVoucherStatus
  action: PettyCashVoucherWorkflowAction
}

export type PettyCashVoucherSaveLineInput = {
  accountCode?: string
  glAccountId?: string
  debit?: number | string
  credit?: number | string
  memo?: string | null
}

export type ResolvedPettyCashVoucherLine = {
  lineNo: number
  glAccountId: string
  debit: Prisma.Decimal
  credit: Prisma.Decimal
  memo: string | null
}

export type CreatePettyCashVoucherDraftInput = {
  branchId: string
  legalEntityCode: string
  entryDate: Date | string
  pettyCashAccountId: string
  payeeName: string
  description?: string | null
  refNo?: string | null
  createdByStaffId: string
  lines: PettyCashVoucherSaveLineInput[]
  tx?: Prisma.TransactionClient
}

export type UpdatePettyCashVoucherDraftInput = {
  entryId: string
  entryDate?: Date | string
  pettyCashAccountId?: string
  payeeName?: string
  description?: string | null
  refNo?: string | null
  lines: PettyCashVoucherSaveLineInput[]
  tx?: Prisma.TransactionClient
}

export type DeleteDraftPettyCashVoucherInput = {
  entryId: string
  tx?: Prisma.TransactionClient
}

export type SubmitPettyCashVoucherInput = {
  entryId: string
  submittedByStaffId: string
  tx?: Prisma.TransactionClient
}

export type ConfirmPettyCashVoucherInput = {
  entryId: string
  confirmedByStaffId: string
  tx?: Prisma.TransactionClient
}

export type CancelPettyCashVoucherInput = {
  entryId: string
  cancelledByStaffId: string
  cancelReason?: string | null
  tx?: Prisma.TransactionClient
}

export type PostPettyCashVoucherInput = {
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

export type ApplyCancelledStatusInput = {
  entryId: string
  cancelledByStaffId: string
  cancelReason?: string | null
}

export type AllocatePettyCashVoucherNoInput = {
  legalEntityCode: string
  entryDate: Date
}
