import type { DocumentEntityCode } from "@/lib/legal-entity/constants"

export type FinanceDocumentInquiryPostingState = "all" | "posted" | "unposted"

export type FinanceDocumentInquiryPdfState = "has" | "missing"

export type FinanceDocumentInquiryFilter = {
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

export type FinanceDocumentInquiryRow = {
  id: string
  rowKind: "posted" | "unposted"
  legalEntityCode: string
  documentTypeCode: string
  documentNo: string | null
  voucherNo: string | null
  date: string
  periodKey: string | null
  branchId: string
  branchCode: string
  branchName: string
  status: string
  amount: string
  journalEntryId: string | null
  operationalDocumentId: string | null
  pdfAvailable: boolean | null
  archiveAvailable?: boolean | null
  inquiryPath: string
  printPath: string | null
}

export type FinanceDocumentInquiryResult = {
  documents: FinanceDocumentInquiryRow[]
  total: number
}
