import { formatDocTypeLabel } from "@/lib/stock-ui/format"
import type { StockDocumentEditorStateVM } from "@/lib/stock-ui/editor-types"
import { StockDocumentStatusBadge } from "./StockDocumentStatusBadge"

type StockDocumentHeaderFormProps = {
  state: StockDocumentEditorStateVM
  onChange: (patch: Partial<StockDocumentEditorStateVM>) => void
}

export function StockDocumentHeaderForm({
  state,
  onChange,
}: StockDocumentHeaderFormProps) {
  const disabled = state.readOnly

  return (
    <section className="rounded border border-zinc-200 bg-zinc-50 p-4">
      <h2 className="text-sm font-semibold text-zinc-900">Document header</h2>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-zinc-500">Type</dt>
          <dd className="text-sm font-medium text-zinc-900">
            {formatDocTypeLabel(state.docType)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Status</dt>
          <dd className="mt-1">
            <StockDocumentStatusBadge status={state.status} />
          </dd>
        </div>
        {state.refNo ? (
          <div>
            <dt className="text-xs text-zinc-500">Reference</dt>
            <dd className="font-mono text-sm text-zinc-900">{state.refNo}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          Date
          <input
            type="date"
            className="rounded border border-zinc-300 bg-white px-2 py-1 disabled:bg-zinc-100"
            value={state.date}
            disabled={disabled}
            onChange={(e) => onChange({ date: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          From location (branch id)
          <input
            type="text"
            className="rounded border border-zinc-300 bg-white px-2 py-1 disabled:bg-zinc-100"
            value={state.fromLocId}
            disabled={disabled}
            onChange={(e) => onChange({ fromLocId: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          To location (branch id)
          <input
            type="text"
            className="rounded border border-zinc-300 bg-white px-2 py-1 disabled:bg-zinc-100"
            value={state.toLocId}
            disabled={disabled}
            onChange={(e) => onChange({ toLocId: e.target.value })}
          />
        </label>
      </div>
    </section>
  )
}
