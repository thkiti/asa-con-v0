import { SHOP_STOCK_DOC_TYPES } from "./constants"
import type {
  EditorLineRowVM,
  SaveStockDocumentPayload,
  StockDocumentEditorStateVM,
} from "./editor-types"
import type { DocType, StockDocumentDetailVM } from "./types"

let lineKeySeq = 0

export function nextEditorLineKey(): string {
  lineKeySeq += 1
  return `line-${lineKeySeq}`
}

export function createEmptyEditorLine(): EditorLineRowVM {
  return {
    key: nextEditorLineKey(),
    productId: "",
    productCode: "",
    productName: "",
    qty: "",
    endingQty: "",
    reviewPostingDelta: "",
  }
}

export function isShopDocType(value: string): value is DocType {
  return (SHOP_STOCK_DOC_TYPES as readonly string[]).includes(value)
}

export function defaultLocationsForDocType(
  docType: DocType,
  shopBranchId: string
): { fromLocId: string; toLocId: string } {
  switch (docType) {
    case "TRANSFER_OUT":
      return { fromLocId: shopBranchId, toLocId: "" }
    case "PERFORMANCE":
    case "ADJUSTMENT":
      return { fromLocId: shopBranchId, toLocId: "" }
    default:
      return { fromLocId: shopBranchId, toLocId: "" }
  }
}

export function createDraftEditorState(
  docType: DocType,
  branchId: string
): StockDocumentEditorStateVM {
  const locs = defaultLocationsForDocType(docType, branchId)
  const today = new Date().toISOString().slice(0, 10)

  return {
    documentId: null,
    refNo: null,
    docType,
    status: "DRAFT",
    date: today,
    branchId,
    fromLocId: locs.fromLocId,
    toLocId: locs.toLocId,
    readOnly: false,
    lines: [createEmptyEditorLine()],
  }
}

export function detailToEditorState(detail: StockDocumentDetailVM): StockDocumentEditorStateVM {
  const readOnly = detail.status !== "DRAFT"
  const date = detail.date.slice(0, 10)

  return {
    documentId: detail.id,
    refNo: detail.refNo,
    docType: detail.docType,
    status: detail.status,
    date,
    branchId: detail.branchId,
    fromLocId: detail.fromLocId ?? "",
    toLocId: detail.toLocId ?? "",
    readOnly,
    lines:
      detail.lines.length > 0
        ? detail.lines.map((line) => ({
            key: line.id,
            productId: line.productId,
            productCode: line.product.code,
            productName: line.product.name,
            qty: String(line.qty),
            endingQty: line.endingQty == null ? "" : String(line.endingQty),
            reviewPostingDelta:
              line.reviewPostingDelta == null ? "" : String(line.reviewPostingDelta),
          }))
        : readOnly
          ? []
          : [createEmptyEditorLine()],
  }
}

export function addEditorLine(
  lines: EditorLineRowVM[]
): EditorLineRowVM[] {
  return [...lines, createEmptyEditorLine()]
}

export function removeEditorLine(
  lines: EditorLineRowVM[],
  key: string
): EditorLineRowVM[] {
  const next = lines.filter((line) => line.key !== key)
  return next.length > 0 ? next : [createEmptyEditorLine()]
}

export function updateEditorLine(
  lines: EditorLineRowVM[],
  key: string,
  patch: Partial<EditorLineRowVM>
): EditorLineRowVM[] {
  return lines.map((line) => (line.key === key ? { ...line, ...patch } : line))
}

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n)) return null
  return Math.trunc(n)
}

export function editorStateToSavePayload(
  state: StockDocumentEditorStateVM,
  staffId: string
): SaveStockDocumentPayload {
  const lines = state.lines
    .filter((line) => line.productId.trim() || line.qty.trim())
    .map((line) => ({
      productId: line.productId.trim(),
      qty: Number(line.qty.trim() || 0),
      endingQty: parseOptionalInt(line.endingQty),
      reviewPostingDelta: parseOptionalInt(line.reviewPostingDelta),
    }))

  return {
    id: state.documentId,
    docType: state.docType,
    date: state.date,
    branchId: state.branchId,
    fromLocId: state.fromLocId.trim() || null,
    toLocId: state.toLocId.trim() || null,
    createdByStaffId: staffId,
    lines,
  }
}

export function mergeSavedDetailWithEditorLines(
  saved: StockDocumentDetailVM,
  priorLines: EditorLineRowVM[]
): StockDocumentDetailVM {
  const productById = new Map(
    priorLines
      .filter((l) => l.productId)
      .map((l) => [
        l.productId,
        { code: l.productCode, name: l.productName },
      ])
  )

  return {
    ...saved,
    lines: saved.lines.map((line) => {
      const prior = productById.get(line.productId)
      return {
        ...line,
        product: prior
          ? { id: line.productId, code: prior.code, name: prior.name }
          : line.product ?? {
              id: line.productId,
              code: line.productId,
              name: line.productId,
            },
      }
    }),
  }
}

/** After first save on /new, navigate to the persisted document URL. */
export function postSaveEditorPath(
  mode: "create" | "edit",
  savedDocumentId: string
): string | null {
  if (mode !== "create") return null
  const id = savedDocumentId.trim()
  return id ? `/shop/stock-documents/${id}` : null
}
