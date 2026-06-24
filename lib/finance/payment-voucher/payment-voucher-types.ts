import type {
  PaymentVoucher,
  PaymentVoucherLine,
  PaymentVoucherStatus,
  Prisma,
} from "@/generated/prisma/client"

export type PaymentVoucherWithLines = PaymentVoucher & {
  lines: PaymentVoucherLine[]
}

export type PaymentVoucherWorkflowAction = "SUBMIT" | "CONFIRM" | "POST" | "CANCEL"

export type PaymentVoucherTransitionContext = {
  fromStatus: PaymentVoucherStatus
  action: PaymentVoucherWorkflowAction
}

export type PaymentVoucherSaveLineInput = {
  accountCode?: string
  glAccountId?: string
  debit?: number | string
  credit?: number | string
  memo?: string | null
}

export type ResolvedPaymentVoucherLine = {
  lineNo: number
  glAccountId: string
  debit: Prisma.Decimal
  credit: Prisma.Decimal
  memo: string | null
}

export type CreatePaymentVoucherDraftInput = {
  branchId: string
  legalEntityCode: string
  entryDate: Date | string
  payFromAccountId: string
  payeeName: string
  description?: string | null
  refNo?: string | null
  chequeNo?: string | null
  createdByStaffId: string
  lines: PaymentVoucherSaveLineInput[]
  tx?: Prisma.TransactionClient
}

export type UpdatePaymentVoucherDraftInput = {
  entryId: string
  entryDate?: Date | string
  payFromAccountId?: string
  payeeName?: string
  description?: string | null
  refNo?: string | null
  chequeNo?: string | null
  lines: PaymentVoucherSaveLineInput[]
  tx?: Prisma.TransactionClient
}

export type DeleteDraftPaymentVoucherInput = {
  entryId: string
  tx?: Prisma.TransactionClient
}

export type SubmitPaymentVoucherInput = {
  entryId: string
  submittedByStaffId: string
  tx?: Prisma.TransactionClient
}

export type ConfirmPaymentVoucherInput = {
  entryId: string
  confirmedByStaffId: string
  tx?: Prisma.TransactionClient
}

export type CancelPaymentVoucherInput = {
  entryId: string
  cancelledByStaffId: string
  cancelReason?: string | null
  tx?: Prisma.TransactionClient
}

export type PostPaymentVoucherInput = {
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

export type AllocatePaymentVoucherNoInput = {
  legalEntityCode: string
  entryDate: Date
}
