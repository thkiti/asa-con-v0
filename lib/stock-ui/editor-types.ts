import type { DocStatus, DocType } from "./types"

export type EditorLineRowVM = {
  key: string
  productId: string
  productCode: string
  productName: string
  qty: string
  endingQty: string
  reviewPostingDelta: string
}

export type StockDocumentEditorStateVM = {
  documentId: string | null
  refNo: string | null
  docType: DocType
  status: DocStatus
  date: string
  branchId: string
  fromLocId: string
  toLocId: string
  readOnly: boolean
  lines: EditorLineRowVM[]
}

export type SaveStockDocumentPayload = {
  id?: string | null
  docType: DocType
  date: string
  branchId: string
  fromLocId?: string | null
  toLocId?: string | null
  createdByStaffId?: string | null
  lines: Array<{
    productId: string
    qty: number
    endingQty?: number | null
    reviewPostingDelta?: number | null
  }>
}
