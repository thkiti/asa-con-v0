import type {
  InvoiceVoucher,
  InvoiceVoucherLine,
  InvoiceVoucherStatus,
  Prisma,
} from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"

export type InvoiceVoucherWithLines = InvoiceVoucher & {
  lines: InvoiceVoucherLine[]
}

export type InvoiceVoucherWorkflowAction = "SUBMIT" | "CONFIRM" | "POST" | "CANCEL"

export type InvoiceVoucherTransitionContext = {
  fromStatus: InvoiceVoucherStatus
  action: InvoiceVoucherWorkflowAction
}

export type InvoiceVoucherSaveLineInput = {
  accountCode?: string
  glAccountId?: string
  debit?: number | string
  credit?: number | string
  memo?: string | null
}

export type ResolvedInvoiceVoucherLine = {
  lineNo: number
  glAccountId: string
  debit: Prisma.Decimal
  credit: Prisma.Decimal
  memo: string | null
}

export type CreateInvoiceVoucherDraftInput = {
  branchId: string
  legalEntityCode: string
  invoiceDate: Date | string
  dueDate?: Date | string | null
  customerName: string
  description?: string | null
  refNo?: string | null
  createdByStaffId: string
  lines: InvoiceVoucherSaveLineInput[]
  tx?: Prisma.TransactionClient
}

export type UpdateInvoiceVoucherDraftInput = {
  entryId: string
  legalEntityCode: DocumentEntityCode
  invoiceDate?: Date | string
  dueDate?: Date | string | null
  customerName?: string
  description?: string | null
  refNo?: string | null
  lines: InvoiceVoucherSaveLineInput[]
  tx?: Prisma.TransactionClient
}

export type DeleteDraftInvoiceVoucherInput = {
  entryId: string
  legalEntityCode: DocumentEntityCode
  tx?: Prisma.TransactionClient
}

export type SubmitInvoiceVoucherInput = {
  entryId: string
  legalEntityCode: DocumentEntityCode
  submittedByStaffId: string
  tx?: Prisma.TransactionClient
}

export type ConfirmInvoiceVoucherInput = {
  entryId: string
  legalEntityCode: DocumentEntityCode
  confirmedByStaffId: string
  tx?: Prisma.TransactionClient
}

export type CancelInvoiceVoucherInput = {
  entryId: string
  legalEntityCode: DocumentEntityCode
  cancelledByStaffId: string
  cancelReason?: string | null
  tx?: Prisma.TransactionClient
}

export type PostInvoiceVoucherInput = {
  entryId: string
  legalEntityCode: DocumentEntityCode
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

export type AllocateInvoiceVoucherNoInput = {
  legalEntityCode: string
  invoiceDate: Date
}
