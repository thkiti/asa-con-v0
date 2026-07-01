import type { PettyCashVoucherStatus } from "@/generated/prisma/client"

export type PettyCashVoucherLineRead = {
  id: string
  lineNo: number
  glAccountId: string
  accountCode: string
  accountName: string
  debit: string
  credit: string
  memo: string | null
}

export type PettyCashVoucherRead = {
  id: string
  entryNo: string
  status: PettyCashVoucherStatus
  branchId: string
  legalEntityCode: string
  entryDate: string
  pettyCashAccountId: string
  pettyCashAccountCode: string
  pettyCashAccountName: string
  payeeName: string
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
  lines: PettyCashVoucherLineRead[]
}

export type PettyCashVoucherListItem = {
  id: string
  entryNo: string
  status: PettyCashVoucherStatus
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

export type PettyCashVoucherListFilter = {
  legalEntityCode?: string
  status?: PettyCashVoucherStatus
  branchId?: string
  search?: string
  postingState?: "posted" | "unposted"
  dateFrom?: Date | string
  dateTo?: Date | string
  limit?: number
  offset?: number
}

export type PettyCashVoucherListResult = {
  entries: PettyCashVoucherListItem[]
  total: number
}
