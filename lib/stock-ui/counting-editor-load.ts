import {
  countingEditorHeaderFromDetail,
  countingEditorHeaderFromDraft,
  hydrateCountingEditorState,
} from "./editor-draft-state"
import type { StockDocumentEditorStateVM } from "./editor-types"
import { fetchStockInputList } from "./fetchers"
import {
  mergeInputListWithSavedLines,
  type MergedCountingRowVM,
} from "./merge-input-list-with-saved-lines"
import type { DocType } from "./types"
import type { StockDocumentDetailVM } from "./types"

export type CountingEditorLoadResult = {
  state: StockDocumentEditorStateVM
  orphans: MergedCountingRowVM[]
}

export async function loadCountingEditorStateForCreate(
  branchId: string,
  docType: DocType = "ADJUSTMENT",
  legalEntityCode: string = "AS"
): Promise<CountingEditorLoadResult> {
  const inputRows = await fetchStockInputList()
  const mergeResult = mergeInputListWithSavedLines(inputRows, [])
  const header = countingEditorHeaderFromDraft(docType, branchId, legalEntityCode)

  return {
    state: hydrateCountingEditorState(header, mergeResult),
    orphans: mergeResult.orphans,
  }
}

export async function loadCountingEditorStateForEdit(
  detail: StockDocumentDetailVM
): Promise<CountingEditorLoadResult> {
  const inputRows = await fetchStockInputList()
  const mergeResult = mergeInputListWithSavedLines(inputRows, detail.lines)
  const header = countingEditorHeaderFromDetail(detail)

  return {
    state: hydrateCountingEditorState(header, mergeResult),
    orphans: mergeResult.orphans,
  }
}
