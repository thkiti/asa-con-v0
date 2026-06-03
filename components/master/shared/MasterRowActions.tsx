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
  /** When false, edit button stays visible but disabled (read-only phase). */
  editDisabled?: boolean
  deleteDisabled?: boolean
}

export function MasterRowActions({
  editTitle,
  deleteTitle,
  editAriaLabel,
  deleteAriaLabel,
  editDisabled = true,
  deleteDisabled = true,
}: MasterRowActionsProps) {
  return (
    <td className={masterTableActionsCell}>
      <div className={masterRowActionsWrap}>
        <button
          type="button"
          className={masterRowActionBtn}
          disabled={editDisabled}
          title={editTitle}
          aria-label={editAriaLabel ?? editTitle}
        >
          ✎
        </button>
        <button
          type="button"
          className={masterRowActionBtn}
          disabled={deleteDisabled}
          title={deleteTitle}
          aria-label={deleteAriaLabel ?? deleteTitle}
        >
          🗑
        </button>
      </div>
    </td>
  )
}
