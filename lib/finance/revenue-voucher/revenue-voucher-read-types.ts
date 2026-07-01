import type { RevenueVoucherStatus } from "@/generated/prisma/client"

export type RevenueVoucherLineRead = {
  id: string
  lineNo: number
  glAccountId: string
  accountCode: string
  accountName: string
  debit: string
  credit: string
  memo: string | null
}

export type RevenueVoucherRead = {
  id: string
  entryNo: string
  status: RevenueVoucherStatus
  branchId: string
  legalEntityCode: string
  entryDate: string
  receiveToAccountId: string
  receiveToAccountCode: string
  receiveToAccountName: string
  receivedFromName: string
  refNo: string | null
  receiptNo: string | null
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
  lines: RevenueVoucherLineRead[]
}

export type RevenueVoucherListItem = {
  id: string
  entryNo: string
  status: RevenueVoucherStatus
  branchId: string
  legalEntityCode: string
  entryDate: string
  receivedFromName: string
  totalAmount: string
  lineCount: number
  createdByStaffId: string
  postedAt: string | null
  createdAt: string
}

export type RevenueVoucherListFilter = {
  legalEntityCode?: string
  status?: RevenueVoucherStatus
  branchId?: string
  search?: string
  postingState?: "posted" | "unposted"
  dateFrom?: Date | string
  dateTo?: Date | string
  limit?: number
  offset?: number
}

export type RevenueVoucherListResult = {
  entries: RevenueVoucherListItem[]
  total: number
}
