"use client"

import { formatThermalMoney2 } from "@/lib/thermal/format"
import {
  READ_Z_GROUP_TABLE_HEADER_LABEL,
  formatReadZGroupDisplayLeft,
} from "@/lib/thermal/read-z-group-display"
import type { ReadReportGroupLine } from "@/lib/pos/aggregatePosReadReport"

function formatReadZRowQty(q: number): string {
  if (Number.isInteger(q)) return String(q)
  return q.toFixed(2)
}

type ReadZGroupTableProps = {
  rows: ReadReportGroupLine[]
  testId?: string
}

/** READ Z group list — sticky header + rows inside the scroll area. */
export function ReadZGroupTable({ rows, testId = "read-z-group-table" }: ReadZGroupTableProps) {
  return (
    <div
      className="read-z-group-table readZScrollableGroupArea"
      data-testid="read-z-group-table-scroll"
    >
      <div className="readZGroupStickyHeader">
        <div className="readZGroupTableHeader readZGroupHeaderRow">
          <span className="readZGroupName">{READ_Z_GROUP_TABLE_HEADER_LABEL}</span>
          <span className="readZGroupQty">Qty</span>
          <span className="readZGroupAmount">Amount</span>
        </div>
        <div className="readZGroupSeparator" aria-hidden />
      </div>
      <div className="readZGroupTableRows readZGroupRows">
        {rows.map((row) => {
          const displayLabel = formatReadZGroupDisplayLeft(row.displayLeft)
          return (
            <div key={row.lineKey} className="readZGroupTableRow readZGroupRow">
              <span className="readZGroupName" title={row.displayLeft}>
                {displayLabel}
              </span>
              <span className="readZGroupQty tabular-nums">{formatReadZRowQty(row.qty)}</span>
              <span className="readZGroupAmount tabular-nums">
                {formatThermalMoney2(row.amount)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
