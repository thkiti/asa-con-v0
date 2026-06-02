import type { DocStatus, DocType } from "@/generated/prisma/client"

export type StockDocumentListItem = {
  id: string
  refNo: string
  docType: DocType
  status: DocStatus
  date: string
  periodMonth: string | null
  branchId: string
  fromLocId: string | null
  toLocId: string | null
  submittedAt: string | null
  confirmedAt: string | null
  postedAt: string | null
  cancelledAt: string | null
  lineCount: number
  createdAt: string
}

export type StockDocumentListResult = {
  items: StockDocumentListItem[]
  nextCursor: string | null
  hasMore: boolean
}

export type StockDocumentLineRead = {
  id: string
  productId: string
  qty: number
  endingQty: number | null
  reviewPostingDelta: number | null
  product: {
    id: string
    code: string
    name: string
  }
}

export type StockDocumentDetailRead = {
  id: string
  refNo: string
  docType: DocType
  status: DocStatus
  date: string
  periodMonth: string | null
  branchId: string
  fromLocId: string | null
  toLocId: string | null
  submittedAt: string | null
  confirmedAt: string | null
  postedAt: string | null
  createdByStaffId: string | null
  confirmedByStaffId: string | null
  postedByStaffId: string | null
  cancelledAt: string | null
  cancelledByStaffId: string | null
  cancelReason: string | null
  createdAt: string
  lines: StockDocumentLineRead[]
}

export type StockDocumentListQuery = {
  branchId: string
  docType?: DocType
  status?: DocStatus
  periodMonth?: string
  fromDate?: Date
  toDate?: Date
  cursor?: string | null
  limit: number
  docTypes?: readonly DocType[]
}
