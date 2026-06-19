import type { FinanceDocumentHeaderContext } from "@/lib/finance-ui/finance-document-display"

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
  legalEntityCode: string
  date: string
  status: string
  branchId: string
  refType: string
  refId: string
  refNo: string | null
  description: string | null
  postedAt: string | null
  documentHeader: FinanceDocumentHeaderContext | null
  lines: VoucherLineDetail[]
  journal: VoucherJournalDetail | null
}

export type VoucherDetailResult = {
  voucher: VoucherDetail
}
