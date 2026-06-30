import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import type {
  FinanceDocumentInquiryPdfState,
  FinanceDocumentInquiryPostingState,
} from "./finance-document-inquiry-types"

export type FinanceVoucherListFilter = {
  legalEntityCode: DocumentEntityCode
  voucherNo?: string
  refNo?: string
  refType?: string
  refTypeIn?: string[]
  periodKey?: string
  dateFrom?: Date | string
  dateTo?: Date | string
  branchId?: string
  status?: string
  postingState?: FinanceDocumentInquiryPostingState
  amountMin?: string | number
  amountMax?: string | number
  pdfState?: FinanceDocumentInquiryPdfState
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
  refId: string
  refNo: string | null
  description: string | null
  status: string
  totalDebit: string
  totalCredit: string
  branchId: string
  branchCode: string
  branchName: string
  journalEntryId: string | null
  amount: string
  documentTypeCode: string
  documentNo: string | null
  pdfAvailable: boolean | null
  archiveAvailable?: boolean | null
}

export type FinanceVoucherListResult = {
  vouchers: FinanceVoucherListRow[]
  total: number
}
