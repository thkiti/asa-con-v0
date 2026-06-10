import Link from "next/link"
import { stockCountStaffActionClass } from "./counting-sheet-styles"
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
  backHref?: string
  backLabel?: string
  /** Staff count header: slightly softer button corners. */
  staffCountControls?: boolean
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

function actionButtonClass(
  action: StockDocumentActionVM,
  staffCountControls: boolean
): string {
  if (staffCountControls && !action.destructive) {
    return stockCountStaffActionClass
  }

  const base = `${
    staffCountControls ? "rounded-md" : "rounded"
  } px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50`
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
  backHref = "/shop/stock-documents",
  backLabel = "Back to list",
  staffCountControls = false,
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
            className={actionButtonClass(action, staffCountControls)}
            disabled={!action.enabled || busy}
            onClick={() => onWorkflowAction(action.id)}
          >
            {label}
          </button>
        )
      })}
      <Link
        href={backHref}
        className={
          staffCountControls
            ? stockCountStaffActionClass
            : "rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
        }
      >
        {backLabel}
      </Link>
    </div>
  )
}
