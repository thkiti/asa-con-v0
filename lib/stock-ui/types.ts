import type { DocStatus, DocType } from "@/generated/prisma/client"

export type { DocStatus, DocType }

/** View-model aliases aligned with read services (Phase 23F will extend, not replace). */
export type StockDocumentListItemVM = {
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

export type StockDocumentListResultVM = {
  items: StockDocumentListItemVM[]
  nextCursor: string | null
  hasMore: boolean
}

export type StockDocumentLineVM = {
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

export type StockDocumentDetailVM = {
  id: string
  refNo: string
  docType: DocType
  status: DocStatus
  date: string
  periodMonth: string | null
  branchId: string
  /** Owning legal entity on the StockDocument (AS | AD). */
  legalEntityCode: string
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
  lines: StockDocumentLineVM[]
}

export type StockDocumentListFilter = {
  branchId?: string
  docType?: DocType
  status?: DocStatus
  /** Canonical period filter YYYY-MM (PeriodSelector output). */
  periodKey?: string
  /** @deprecated Prefer periodKey — kept for callers that still set periodMonth. */
  periodMonth?: string
  from?: string
  to?: string
  cursor?: string | null
  limit?: number
}

export type StockDocumentActionId =
  | "save"
  | "submit"
  | "confirm"
  | "cancel"
  | "deleteDraft"
  | "post"
  | "print"

export type StockDocumentActionVM = {
  id: StockDocumentActionId
  label: string
  visible: boolean
  enabled: boolean
  destructive?: boolean
  primary?: boolean
}
