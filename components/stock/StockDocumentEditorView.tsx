import Link from "next/link"
import type {
  EditorLineRowVM,
  StockDocumentEditorStateVM,
} from "@/lib/stock-ui/editor-types"
import type { StockDocumentActionId, StockDocumentActionVM } from "@/lib/stock-ui/types"
import { StockDocumentHeaderForm } from "./StockDocumentHeaderForm"
import { StockDocumentLinesTable } from "./StockDocumentLinesTable"

type StockDocumentEditorViewProps = {
  state: StockDocumentEditorStateVM
  loading: boolean
  saving: boolean
  actionBusy: StockDocumentActionId | null
  actions: StockDocumentActionVM[]
  error: string | null
  statusMessage: string | null
  onHeaderChange: (patch: Partial<StockDocumentEditorStateVM>) => void
  onAddLine: () => void
  onRemoveLine: (key: string) => void
  onLineChange: (key: string, patch: Partial<EditorLineRowVM>) => void
  onWorkflowAction: (actionId: StockDocumentActionId) => void
}

function actionBusyLabel(actionId: StockDocumentActionId): string {
  switch (actionId) {
    case "save":
      return "Saving…"
    case "submit":
      return "Submitting…"
    case "confirm":
      return "Confirming…"
    case "cancel":
      return "Cancelling…"
    default:
      return "Working…"
  }
}

function actionButtonClass(action: StockDocumentActionVM): string {
  const base =
    "rounded px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
  if (action.destructive) {
    return `${base} border border-red-300 bg-white text-red-800 hover:bg-red-50`
  }
  if (action.primary) {
    return `${base} bg-zinc-900 text-white hover:bg-zinc-800`
  }
  return `${base} border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100`
}

export function StockDocumentEditorView({
  state,
  loading,
  saving,
  actionBusy,
  actions,
  error,
  statusMessage,
  onHeaderChange,
  onAddLine,
  onRemoveLine,
  onLineChange,
  onWorkflowAction,
}: StockDocumentEditorViewProps) {
  const visibleActions = actions.filter((action) => action.visible)
  const busy = saving || actionBusy !== null

  return (
    <div className="space-y-6">
      {loading ? <p className="text-sm text-zinc-600">Loading document…</p> : null}

      {state.readOnly && !loading ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This document is not a draft. Editing is disabled.
        </p>
      ) : null}

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {statusMessage ? (
        <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {statusMessage}
        </p>
      ) : null}

      {!loading ? (
        <>
          <StockDocumentHeaderForm state={state} onChange={onHeaderChange} />

          <StockDocumentLinesTable
            docType={state.docType}
            lines={state.lines}
            readOnly={state.readOnly}
            onAddLine={onAddLine}
            onRemoveLine={onRemoveLine}
            onLineChange={onLineChange}
          />

          <div className="flex flex-wrap items-center gap-3">
            {visibleActions.map((action) => {
              if (action.id === "save" && state.readOnly) {
                return null
              }

              const isBusy =
                (action.id === "save" && saving) || actionBusy === action.id
              const label = isBusy ? actionBusyLabel(action.id) : action.label

              return (
                <button
                  key={action.id}
                  type="button"
                  className={actionButtonClass(action)}
                  disabled={!action.enabled || busy}
                  onClick={() => onWorkflowAction(action.id)}
                >
                  {label}
                </button>
              )
            })}
            <Link
              href="/shop/stock-documents"
              className="text-sm text-zinc-600 hover:text-zinc-900"
            >
              Back to list
            </Link>
          </div>
        </>
      ) : null}
    </div>
  )
}
