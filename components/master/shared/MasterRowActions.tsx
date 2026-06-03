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
  resetPasswordTitle?: string
  resetPasswordAriaLabel?: string
  /** When false, edit button stays visible but disabled (read-only phase). */
  editDisabled?: boolean
  deleteDisabled?: boolean
  resetPasswordDisabled?: boolean
  /** Trash list: show restore instead of delete. */
  trashMode?: boolean
  restoreDisabled?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onRestore?: () => void
  onResetPassword?: () => void
}

export function MasterRowActions({
  editTitle,
  deleteTitle,
  editAriaLabel,
  deleteAriaLabel,
  restoreTitle = "Restore branch",
  restoreAriaLabel,
  resetPasswordTitle = "Reset password",
  resetPasswordAriaLabel,
  editDisabled = true,
  deleteDisabled = true,
  resetPasswordDisabled = true,
  trashMode = false,
  restoreDisabled = true,
  onEdit,
  onDelete,
  onRestore,
  onResetPassword,
}: MasterRowActionsProps) {
  const editEnabled = Boolean(onEdit) && !editDisabled
  const deleteEnabled = Boolean(onDelete) && !deleteDisabled
  const restoreEnabled = Boolean(onRestore) && !restoreDisabled
  const resetEnabled = Boolean(onResetPassword) && !resetPasswordDisabled && !trashMode

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
        {!trashMode && onResetPassword ? (
          <button
            type="button"
            className={masterRowActionBtn}
            disabled={!resetEnabled}
            title={resetPasswordTitle}
            aria-label={resetPasswordAriaLabel ?? resetPasswordTitle}
            onClick={onResetPassword}
          >
            🔑
          </button>
        ) : null}
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
