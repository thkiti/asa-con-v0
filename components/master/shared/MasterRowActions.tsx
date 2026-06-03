import {
  masterRowActionBtn,
  masterRowActionsWrap,
  masterTableActionsCell,
} from "@/lib/master-ui/table-classes"

export type MasterRowActionsProps = {
  editTitle: string
  deleteTitle: string
  editAriaLabel?: string
  deleteAriaLabel?: string
  restoreTitle?: string
  restoreAriaLabel?: string
  /** When false, edit button stays visible but disabled (read-only phase). */
  editDisabled?: boolean
  deleteDisabled?: boolean
  /** Trash list: show restore instead of delete. */
  trashMode?: boolean
  restoreDisabled?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onRestore?: () => void
}

export function MasterRowActions({
  editTitle,
  deleteTitle,
  editAriaLabel,
  deleteAriaLabel,
  restoreTitle = "Restore branch",
  restoreAriaLabel,
  editDisabled = true,
  deleteDisabled = true,
  trashMode = false,
  restoreDisabled = true,
  onEdit,
  onDelete,
  onRestore,
}: MasterRowActionsProps) {
  const editEnabled = Boolean(onEdit) && !editDisabled
  const deleteEnabled = Boolean(onDelete) && !deleteDisabled
  const restoreEnabled = Boolean(onRestore) && !restoreDisabled

  return (
    <td className={masterTableActionsCell}>
      <div className={masterRowActionsWrap}>
        <button
          type="button"
          className={masterRowActionBtn}
          disabled={!editEnabled}
          title={editTitle}
          aria-label={editAriaLabel ?? editTitle}
          onClick={onEdit}
        >
          ✎
        </button>
        {trashMode ? (
          <button
            type="button"
            className={masterRowActionBtn}
            disabled={!restoreEnabled}
            title={restoreTitle}
            aria-label={restoreAriaLabel ?? restoreTitle}
            onClick={onRestore}
          >
            ↩
          </button>
        ) : (
          <button
            type="button"
            className={masterRowActionBtn}
            disabled={!deleteEnabled}
            title={deleteTitle}
            aria-label={deleteAriaLabel ?? deleteTitle}
            onClick={onDelete}
          >
            🗑
          </button>
        )}
      </div>
    </td>
  )
}
