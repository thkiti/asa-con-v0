import type { ReactNode } from "react"
import { masterTableCell, masterTableRow } from "@/lib/master-ui/table-classes"

type MasterTableRowProps = {
  cells: ReactNode[]
}

export function MasterTableRow({ cells }: MasterTableRowProps) {
  return (
    <tr className={masterTableRow}>
      {cells.map((cell, index) => (
        <td key={index} className={masterTableCell}>
          {cell}
        </td>
      ))}
    </tr>
  )
}
