import type { CountingHookGroup } from "@/lib/stock-ui/counting-hook-groups"
import { isCountingEditorMode } from "@/lib/stock-ui/editor-draft-state"
import type {
  EditorLineRowVM,
  StockDocumentEditorStateVM,
} from "@/lib/stock-ui/editor-types"
import type {
  StockDocumentActionId,
  StockDocumentActionVM,
  StockDocumentDetailVM,
} from "@/lib/stock-ui/types"
import { StockDocumentCountingSheet } from "./StockDocumentCountingSheet"
import { StockDocumentEditorToolbarActions } from "./StockDocumentEditorToolbarActions"
import { StockDocumentHeaderForm } from "./StockDocumentHeaderForm"
import { StockDocumentLinesTable } from "./StockDocumentLinesTable"
import {
  StockDocumentPrintHeader,
  StockDocumentPrintLinesTable,
} from "./stock-document-print-ui"

type StockDocumentEditorViewProps = {
  state: StockDocumentEditorStateVM
  detailSnapshot: StockDocumentDetailVM | null
  loading: boolean
  saving: boolean
  actionBusy: StockDocumentActionId | null
  actions: StockDocumentActionVM[]
  error: string | null
  statusMessage: string | null
  countingMode: boolean
  activeHookGroup: CountingHookGroup
  onHookGroupChange: (hookGroup: CountingHookGroup) => void
  onHeaderChange: (patch: Partial<StockDocumentEditorStateVM>) => void
  onAddLine: () => void
  onRemoveLine: (key: string) => void
  onLineChange: (key: string, patch: Partial<EditorLineRowVM>) => void
  onWorkflowAction: (actionId: StockDocumentActionId) => void
}

export function StockDocumentEditorView({
  state,
  detailSnapshot,
  loading,
  saving,
  actionBusy,
  actions,
  error,
  statusMessage,
  countingMode,
  activeHookGroup,
  onHookGroupChange,
  onHeaderChange,
  onAddLine,
  onRemoveLine,
  onLineChange,
  onWorkflowAction,
}: StockDocumentEditorViewProps) {
  const showCountingGrid = countingMode && isCountingEditorMode(state)

  const toolbarActions = (
    <StockDocumentEditorToolbarActions
      state={state}
      actions={actions}
      saving={saving}
      actionBusy={actionBusy}
      onWorkflowAction={onWorkflowAction}
    />
  )

  return (
    <div className="stock-document-print-shell space-y-6">
      {detailSnapshot ? (
        <>
          <StockDocumentPrintHeader detail={detailSnapshot} />
          <StockDocumentPrintLinesTable detail={detailSnapshot} />
        </>
      ) : null}

      {loading ? <p className="text-sm text-zinc-600">Loading document…</p> : null}

      {state.readOnly && !loading ? (
        <p className="no-print rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This document is not a draft. Editing is disabled.
        </p>
      ) : null}

      {error ? (
        <p className="no-print rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {statusMessage ? (
        <p className="no-print rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {statusMessage}
        </p>
      ) : null}

      {!loading ? (
        <>
          <div className="no-print">
            <StockDocumentHeaderForm state={state} onChange={onHeaderChange} />
          </div>

          <div className="no-print">
            {showCountingGrid ? (
              <StockDocumentCountingSheet
                lines={state.lines}
                activeHookGroup={activeHookGroup}
                readOnly={state.readOnly}
                onHookGroupChange={onHookGroupChange}
                onLineChange={onLineChange}
                toolbarActions={toolbarActions}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-end gap-4 rounded border border-zinc-200 bg-zinc-50 px-3 py-3">
                  {toolbarActions}
                </div>
                <StockDocumentLinesTable
                  docType={state.docType}
                  lines={state.lines}
                  readOnly={state.readOnly}
                  onAddLine={onAddLine}
                  onRemoveLine={onRemoveLine}
                  onLineChange={onLineChange}
                />
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
