import type { DocStatus, DocType } from "./types"

export type EditorLineRowVM = {
  key: string
  productId: string
  productCode: string
  productName: string
  qty: string
  endingQty: string
  reviewPostingDelta: string
  /** Counting mode metadata — populated for ADJUSTMENT DRAFT only. */
  rowKey?: string
  hookGroup?: string
  hookNo?: number | null
  hookLabel?: string
  displayCode?: string
  sourceType?: "REFERENCE" | "SHOE"
  /** Supplier-facing group from reference stock — counting display only. */
  productGroup?: string | null
  isOrphan?: boolean
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
