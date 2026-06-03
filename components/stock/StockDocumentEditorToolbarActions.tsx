import Link from "next/link"
import type { StockDocumentEditorStateVM } from "@/lib/stock-ui/editor-types"
import type {
  StockDocumentActionId,
  StockDocumentActionVM,
} from "@/lib/stock-ui/types"

export type StockDocumentEditorToolbarActionsProps = {
  state: StockDocumentEditorStateVM
  actions: StockDocumentActionVM[]
  saving: boolean
  actionBusy: StockDocumentActionId | null
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
    case "post":
      return "Posting…"
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

export function StockDocumentEditorToolbarActions({
  state,
  actions,
  saving,
  actionBusy,
  onWorkflowAction,
}: StockDocumentEditorToolbarActionsProps) {
  const visibleActions = actions.filter((action) => action.visible)
  const busy = saving || actionBusy !== null

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
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
        className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
      >
        Back to list
      </Link>
    </div>
  )
}
