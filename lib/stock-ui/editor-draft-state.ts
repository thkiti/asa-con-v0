import { SHOP_STOCK_DOC_TYPES } from "./constants"
import type {
  MergeInputListResult,
  MergedCountingRowVM,
} from "./merge-input-list-with-saved-lines"
import type {
  EditorLineRowVM,
  SaveStockDocumentPayload,
  StockDocumentEditorStateVM,
} from "./editor-types"
import type { DocType, StockDocumentDetailVM } from "./types"

export type CountingEditorHeader = Omit<
  StockDocumentEditorStateVM,
  "lines" | "readOnly"
>

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

export function isCountingEditorMode(state: StockDocumentEditorStateVM): boolean {
  return state.docType === "ADJUSTMENT" && !state.readOnly
}

export function countingEditorHeaderFromDetail(
  detail: StockDocumentDetailVM
): CountingEditorHeader {
  return {
    documentId: detail.id,
    refNo: detail.refNo,
    docType: detail.docType,
    status: detail.status,
    date: detail.date.slice(0, 10),
    branchId: detail.branchId,
    fromLocId: detail.fromLocId ?? "",
    toLocId: detail.toLocId ?? "",
  }
}

export function countingEditorHeaderFromDraft(
  docType: DocType,
  branchId: string
): CountingEditorHeader {
  const draft = createDraftEditorState(docType, branchId)
  return {
    documentId: draft.documentId,
    refNo: draft.refNo,
    docType: draft.docType,
    status: draft.status,
    date: draft.date,
    branchId: draft.branchId,
    fromLocId: draft.fromLocId,
    toLocId: draft.toLocId,
  }
}

export function mergedRowToEditorLine(row: MergedCountingRowVM): EditorLineRowVM {
  return {
    key: row.rowKey,
    rowKey: row.rowKey,
    productId: row.productId,
    productCode: row.productCode,
    productName: row.productName,
    displayCode: row.displayCode,
    hookGroup: row.hookGroup,
    hookNo: row.hookNo,
    hookLabel: row.hookLabel,
    productGroup: row.productGroup,
    sourceType: row.sourceType,
    isOrphan: row.isOrphan,
    qty: row.qty,
    endingQty: row.endingQty,
    reviewPostingDelta: row.reviewPostingDelta,
  }
}

export function mergedRowsToEditorLines(
  mergeResult: MergeInputListResult
): EditorLineRowVM[] {
  return [...mergeResult.rows, ...mergeResult.orphans].map(mergedRowToEditorLine)
}

export function hydrateCountingEditorState(
  header: CountingEditorHeader,
  mergeResult: MergeInputListResult
): StockDocumentEditorStateVM {
  return {
    ...header,
    readOnly: false,
    lines: mergedRowsToEditorLines(mergeResult),
  }
}

export function applyCountingSaveToEditorState(
  prev: StockDocumentEditorStateVM,
  saved: StockDocumentDetailVM
): StockDocumentEditorStateVM {
  return {
    ...prev,
    documentId: saved.id,
    refNo: saved.refNo,
    status: saved.status,
    date: saved.date.slice(0, 10),
    branchId: saved.branchId,
    fromLocId: saved.fromLocId ?? "",
    toLocId: saved.toLocId ?? "",
  }
}

export function countEditedLinesInHookGroup(
  lines: EditorLineRowVM[],
  hookGroup: string
): number {
  return lines.filter(
    (line) =>
      line.hookGroup === hookGroup && Number(line.qty.trim() || 0) > 0
  ).length
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
  const sourceLines = isCountingEditorMode(state)
    ? state.lines.filter(
        (line) =>
          line.productId.trim() && Number(line.qty.trim() || 0) > 0
      )
    : state.lines.filter((line) => line.productId.trim() || line.qty.trim())

  const lines = sourceLines.map((line) => {
    const base = {
      productId: line.productId.trim(),
      qty: Number(line.qty.trim() || 0),
    }

    if (isCountingEditorMode(state)) {
      return base
    }

    return {
      ...base,
      endingQty: parseOptionalInt(line.endingQty),
      reviewPostingDelta: parseOptionalInt(line.reviewPostingDelta),
    }
  })

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
