import type { DocStatus } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import type { BusinessPhaseCode } from "@/lib/stock-ui/business-phase-title"

export type StockDocumentInquiryPostingState = "all" | "posted" | "unposted"

/** Staff-facing phase filter codes for audit lookup. */
export type StockDocumentInquiryKindFilter =
  | ""
  | "CNT"
  | "ADJ"
  | "ORD"
  | "DEY"
  | "ORS"
  | "ORI"

export type StockDocumentInquiryFilter = {
  legalEntityCode: DocumentEntityCode
  branchId?: string
  periodKey?: string
  dateFrom?: Date | string
  dateTo?: Date | string
  kind?: StockDocumentInquiryKindFilter
  refNo?: string
  status?: DocStatus
  postingState?: StockDocumentInquiryPostingState
  limit?: number
  offset?: number
}

export type StockDocumentInquiryRow = {
  id: string
  legalEntityCode: string
  documentNo: string
  date: string
  periodKey: string | null
  branchId: string
  branchCode: string
  branchName: string
  phaseCode: BusinessPhaseCode
  status: DocStatus
  posted: boolean
  /** null = archive not supported yet; false = missing/unarchived */
  pdfAvailable: boolean | null
  inquiryPath: string
  printPath: string | null
  voucherId: string | null
  journalEntryId: string | null
}

export type StockDocumentInquiryResult = {
  documents: StockDocumentInquiryRow[]
  total: number
}

export type StockDocumentInquiryLineRow = {
  id: string
  productCode: string
  description: string
  qty: number
  unitCost: string | null
  amount: string | null
  note: string | null
}

export type StockDocumentInquiryDetail = {
  id: string
  legalEntityCode: string
  phaseCode: BusinessPhaseCode
  phaseLabelTh: string
  documentNo: string
  date: string
  branchId: string
  branchCode: string
  branchName: string
  staffId: string | null
  staffName: string | null
  status: DocStatus
  posted: boolean
  pdfAvailable: boolean | null
  printPath: string | null
  voucherId: string | null
  journalEntryId: string | null
  stockMovementPath: string | null
  createdAt: string
  submittedAt: string | null
  confirmedAt: string | null
  postedAt: string | null
  totalQty: number
  totalAmount: string | null
  lines: StockDocumentInquiryLineRow[]
}
