import {
  editorStateToSavePayload,
  mergeSavedDetailWithEditorLines,
  type EditorSaveOptions,
} from "./editor-draft-state"
import { saveStockDocument } from "./fetchers"
import type { StockDocumentEditorStateVM } from "./editor-types"
import type { StockDocumentDetailVM } from "./types"

export async function saveStockDocumentEditor(
  state: StockDocumentEditorStateVM,
  staffId: string,
  priorLines: StockDocumentEditorStateVM["lines"],
  options?: EditorSaveOptions
): Promise<StockDocumentDetailVM> {
  const payload = editorStateToSavePayload(state, staffId, options)
  const saved = await saveStockDocument(payload)
  return mergeSavedDetailWithEditorLines(saved, priorLines)
}
