import type { DocumentEntityCode } from "@/lib/legal-entity/constants"

export type FinanceVoucherListFilter = {
  legalEntityCode: DocumentEntityCode
  voucherNo?: string
  refNo?: string
  refType?: string
  refTypeIn?: string[]
  periodKey?: string
  dateFrom?: Date | string
  dateTo?: Date | string
  limit?: number
  offset?: number
}

export type FinanceVoucherListRow = {
  id: string
  voucherNo: string
  date: string
  legalEntityCode: string
  periodKey: string
  refType: string
  refNo: string | null
  description: string | null
  status: string
  totalDebit: string
  totalCredit: string
}

export type FinanceVoucherListResult = {
  vouchers: FinanceVoucherListRow[]
  total: number
}
