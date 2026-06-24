import type {
  RevenueVoucher,
  RevenueVoucherLine,
  RevenueVoucherStatus,
  Prisma,
} from "@/generated/prisma/client"

export type RevenueVoucherWithLines = RevenueVoucher & {
  lines: RevenueVoucherLine[]
}

export type RevenueVoucherWorkflowAction = "SUBMIT" | "CONFIRM" | "POST" | "CANCEL"

export type RevenueVoucherTransitionContext = {
  fromStatus: RevenueVoucherStatus
  action: RevenueVoucherWorkflowAction
}

export type RevenueVoucherSaveLineInput = {
  accountCode?: string
  glAccountId?: string
  debit?: number | string
  credit?: number | string
  memo?: string | null
}

export type ResolvedRevenueVoucherLine = {
  lineNo: number
  glAccountId: string
  debit: Prisma.Decimal
  credit: Prisma.Decimal
  memo: string | null
}

export type CreateRevenueVoucherDraftInput = {
  branchId: string
  legalEntityCode: string
  entryDate: Date | string
  receiveToAccountId: string
  receivedFromName: string
  description?: string | null
  refNo?: string | null
  receiptNo?: string | null
  createdByStaffId: string
  lines: RevenueVoucherSaveLineInput[]
  tx?: Prisma.TransactionClient
}

export type UpdateRevenueVoucherDraftInput = {
  entryId: string
  entryDate?: Date | string
  receiveToAccountId?: string
  receivedFromName?: string
  description?: string | null
  refNo?: string | null
  receiptNo?: string | null
  lines: RevenueVoucherSaveLineInput[]
  tx?: Prisma.TransactionClient
}

export type DeleteDraftRevenueVoucherInput = {
  entryId: string
  tx?: Prisma.TransactionClient
}

export type SubmitRevenueVoucherInput = {
  entryId: string
  submittedByStaffId: string
  tx?: Prisma.TransactionClient
}

export type ConfirmRevenueVoucherInput = {
  entryId: string
  confirmedByStaffId: string
  tx?: Prisma.TransactionClient
}

export type CancelRevenueVoucherInput = {
  entryId: string
  cancelledByStaffId: string
  cancelReason?: string | null
  tx?: Prisma.TransactionClient
}

export type PostRevenueVoucherInput = {
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

export type AllocateRevenueVoucherNoInput = {
  legalEntityCode: string
  entryDate: Date
}
