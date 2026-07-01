import type { PaymentVoucherStatus } from "@/generated/prisma/client"

export type PaymentVoucherLineRead = {
  id: string
  lineNo: number
  glAccountId: string
  accountCode: string
  accountName: string
  debit: string
  credit: string
  memo: string | null
}

export type PaymentVoucherRead = {
  id: string
  entryNo: string
  status: PaymentVoucherStatus
  branchId: string
  legalEntityCode: string
  entryDate: string
  payFromAccountId: string
  payFromAccountCode: string
  payFromAccountName: string
  payeeName: string
  refNo: string | null
  chequeNo: string | null
  description: string | null
  totalAmount: string
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
  createdAt: string
  updatedAt: string
  lines: PaymentVoucherLineRead[]
}

export type PaymentVoucherListItem = {
  id: string
  entryNo: string
  status: PaymentVoucherStatus
  branchId: string
  legalEntityCode: string
  entryDate: string
  payeeName: string
  totalAmount: string
  lineCount: number
  createdByStaffId: string
  postedAt: string | null
  createdAt: string
}

export type PaymentVoucherListFilter = {
  legalEntityCode?: string
  status?: PaymentVoucherStatus
  branchId?: string
  search?: string
  postingState?: "posted" | "unposted"
  dateFrom?: Date | string
  dateTo?: Date | string
  limit?: number
  offset?: number
}

export type PaymentVoucherListResult = {
  entries: PaymentVoucherListItem[]
  total: number
}
