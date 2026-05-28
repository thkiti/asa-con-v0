export type VoucherLineDetail = {
  id: string
  lineNo: number
  accountCode: string
  accountName: string
  debit: string
  credit: string
  memo: string | null
}

export type VoucherJournalDetail = {
  id: string
  postedAt: string
  lines: VoucherLineDetail[]
}

export type VoucherDetail = {
  id: string
  voucherNo: string
  date: string
  status: string
  branchId: string
  refType: string
  refId: string
  refNo: string | null
  description: string | null
  postedAt: string | null
  lines: VoucherLineDetail[]
  journal: VoucherJournalDetail | null
}

export type VoucherDetailResult = {
  voucher: VoucherDetail
}
