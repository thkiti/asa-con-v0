import type { ReactNode } from "react"
import {
  masterEmptyState,
  masterTable,
  masterTableHead,
  masterTableHeadCell,
  masterTableWrap,
} from "@/lib/master-ui/table-classes"
import type { MasterTableColumn } from "@/lib/master-ui/types"

export type { MasterTableColumn } from "@/lib/master-ui/types"

type MasterTableProps = {
  columns: readonly MasterTableColumn[]
  children?: ReactNode
  emptyMessage?: string
  isEmpty?: boolean
}

/** Master Database table — bounded scroll with sticky semantic header (bg-card). */
export function MasterTable({
  columns,
  children,
  emptyMessage = "No rows to display.",
  isEmpty = false,
}: MasterTableProps) {
  return (
    <div className={masterTableWrap} data-sticky-scroll="true">
      <table className={masterTable}>
        <colgroup>
          {columns.map((col) => (
            <col key={col.key} style={col.width ? { width: col.width } : undefined} />
          ))}
        </colgroup>
        <thead className={masterTableHead}>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={masterTableHeadCell} scope="col">
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
