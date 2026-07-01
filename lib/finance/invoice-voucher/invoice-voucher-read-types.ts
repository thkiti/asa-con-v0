import type { InvoiceVoucherStatus } from "@/generated/prisma/client"

export type InvoiceVoucherLineRead = {
  id: string
  lineNo: number
  glAccountId: string
  accountCode: string
  accountName: string
  debit: string
  credit: string
  memo: string | null
}

export type InvoiceVoucherRead = {
  id: string
  entryNo: string
  status: InvoiceVoucherStatus
  branchId: string
  legalEntityCode: string
  invoiceDate: string
  dueDate: string | null
  customerName: string
  refNo: string | null
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
  lines: InvoiceVoucherLineRead[]
}

export type InvoiceVoucherListItem = {
  id: string
  entryNo: string
  status: InvoiceVoucherStatus
  branchId: string
  legalEntityCode: string
  invoiceDate: string
  dueDate: string | null
  customerName: string
  totalAmount: string
  lineCount: number
  createdByStaffId: string
  postedAt: string | null
  createdAt: string
}

export type InvoiceVoucherListFilter = {
  legalEntityCode?: string
  status?: InvoiceVoucherStatus
  branchId?: string
  search?: string
  postingState?: "posted" | "unposted"
  dateFrom?: Date | string
  dateTo?: Date | string
  limit?: number
  offset?: number
}

export type InvoiceVoucherListResult = {
  entries: InvoiceVoucherListItem[]
  total: number
}
