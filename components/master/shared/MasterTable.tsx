import type { ReactNode } from "react"
import {
  masterEmptyState,
  masterTable,
  masterTableHead,
  masterTableHeadCell,
  masterTableHeadCellSticky,
  masterTableHeadSticky,
  masterTableWrap,
  masterTableWrapSticky,
} from "@/lib/master-ui/table-classes"
import type { MasterTableColumn } from "@/lib/master-ui/types"

export type { MasterTableColumn } from "@/lib/master-ui/types"

type MasterTableProps = {
  columns: readonly MasterTableColumn[]
  children?: ReactNode
  emptyMessage?: string
  isEmpty?: boolean
  /** Enables bounded scroll + sticky header row (semantic bg-card). */
  stickyScroll?: boolean
}

export function MasterTable({
  columns,
  children,
  emptyMessage = "No rows to display.",
  isEmpty = false,
  stickyScroll = false,
}: MasterTableProps) {
  const wrapClass = stickyScroll ? masterTableWrapSticky : masterTableWrap
  const headClass = stickyScroll ? masterTableHeadSticky : masterTableHead
  const headCellClass = stickyScroll ? masterTableHeadCellSticky : masterTableHeadCell

  return (
    <div className={wrapClass} data-sticky-scroll={stickyScroll ? "true" : undefined}>
      <table className={masterTable}>
        <colgroup>
          {columns.map((col) => (
            <col key={col.key} style={col.width ? { width: col.width } : undefined} />
          ))}
        </colgroup>
        <thead className={headClass}>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={headCellClass} scope="col">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children ?? null}</tbody>
      </table>
      {isEmpty ? <p className={masterEmptyState}>{emptyMessage}</p> : null}
    </div>
  )
}
