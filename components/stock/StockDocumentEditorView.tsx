import Link from "next/link"
import type {
  EditorLineRowVM,
  StockDocumentEditorStateVM,
} from "@/lib/stock-ui/editor-types"
import { StockDocumentHeaderForm } from "./StockDocumentHeaderForm"
import { StockDocumentLinesTable } from "./StockDocumentLinesTable"

type StockDocumentEditorViewProps = {
  state: StockDocumentEditorStateVM
  loading: boolean
  saving: boolean
  error: string | null
  saveMessage: string | null
  onHeaderChange: (patch: Partial<StockDocumentEditorStateVM>) => void
  onAddLine: () => void
  onRemoveLine: (key: string) => void
  onLineChange: (key: string, patch: Partial<EditorLineRowVM>) => void
  onSave: () => void
}

export function StockDocumentEditorView({
  state,
  loading,
  saving,
  error,
  saveMessage,
  onHeaderChange,
  onAddLine,
  onRemoveLine,
  onLineChange,
  onSave,
}: StockDocumentEditorViewProps) {
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

      {saveMessage ? (
        <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {saveMessage}
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
            {!state.readOnly ? (
              <button
                type="button"
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                disabled={saving}
                onClick={onSave}
              >
                {saving ? "Saving…" : "Save draft"}
              </button>
            ) : null}
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
