import type { ReactNode } from "react"
import { masterTableCell, masterTableRow } from "@/lib/master-ui/table-classes"

type MasterTableRowProps = {
  cells: ReactNode[]
  /** Rightmost actions cell (e.g. MasterRowActions). */
  actions?: ReactNode
}

export function MasterTableRow({ cells, actions }: MasterTableRowProps) {
  return (
    <tr className={masterTableRow}>
      {cells.map((cell, index) => (
        <td key={index} className={masterTableCell}>
          {cell}
        </td>
      ))}
      {actions}
    </tr>
  )
}
