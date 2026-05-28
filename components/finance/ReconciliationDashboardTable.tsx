"use client"

import { useMemo, useState } from "react"
import { formatAmount } from "@/lib/finance-ui/format"
import type { ReconciliationDashboardRow } from "@/lib/finance-ui/reconciliation"
import { sortDashboardRows } from "@/lib/finance-ui/reconciliation"
import { ReconciliationStatusBadge } from "./ReconciliationStatusBadge"
import { VarianceBadge } from "./VarianceBadge"

type SortKey = keyof Pick<
  ReconciliationDashboardRow,
  | "sourceType"
  | "reference"
  | "branchId"
  | "periodLabel"
  | "expectedAmount"
  | "actualAmount"
  | "variance"
  | "status"
>

type ReconciliationDashboardTableProps = {
  rows: ReconciliationDashboardRow[]
  onSelectRow?: (row: ReconciliationDashboardRow) => void
  selectedRowId?: string | null
}

const columns: Array<{ key: SortKey; label: string; align?: "right" }> = [
  { key: "sourceType", label: "Source type" },
  { key: "reference", label: "Reference" },
  { key: "branchId", label: "Branch" },
  { key: "periodLabel", label: "Period" },
  { key: "expectedAmount", label: "Expected", align: "right" },
  { key: "actualAmount", label: "Actual", align: "right" },
  { key: "variance", label: "Variance", align: "right" },
  { key: "status", label: "Status" },
]

export function ReconciliationDashboardTable({
  rows,
  onSelectRow,
  selectedRowId = null,
}: ReconciliationDashboardTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("sourceType")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const sortedRows = useMemo(
    () => sortDashboardRows(rows, sortKey, sortDirection),
    [rows, sortKey, sortDirection]
  )

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(key)
    setSortDirection("asc")
  }

  if (rows.length === 0) {
    return (
      <p className="mt-4 rounded border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600">
        No reconciliation rows match the current filters.
      </p>
    )
  }

  return (
    <div className="mt-4 overflow-x-auto rounded border border-zinc-200">
      <table className="min-w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-zinc-50">
          <tr className="border-b border-zinc-200 text-left text-zinc-600">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-3 py-2 font-medium ${column.align === "right" ? "text-right" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => toggleSort(column.key)}
                  className="inline-flex items-center gap-1 hover:text-zinc-900"
                >
                  {column.label}
                  {sortKey === column.key ? (
                    <span aria-hidden="true">{sortDirection === "asc" ? "↑" : "↓"}</span>
                  ) : null}
                </button>
              </th>
            ))}
            <th className="px-3 py-2 font-medium text-right">Updated</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr
              key={row.id}
              className={`border-b border-zinc-100 hover:bg-zinc-50 ${selectedRowId === row.id ? "bg-amber-50 ring-1 ring-inset ring-amber-200" : ""}`}
            >
              <td className="px-3 py-2">{row.sourceType}</td>
              <td className="px-3 py-2">
                {onSelectRow ? (
                  <button
                    type="button"
                    onClick={() => onSelectRow(row)}
                    className="text-left text-zinc-900 underline decoration-zinc-300 hover:decoration-zinc-600"
                  >
                    {row.reference}
                  </button>
                ) : (
                  row.reference
                )}
              </td>
              <td className="px-3 py-2 font-mono text-xs">{row.branchId}</td>
              <td className="px-3 py-2 text-zinc-600">{row.periodLabel}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatAmount(row.expectedAmount)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatAmount(row.actualAmount)}
              </td>
              <td className="px-3 py-2 text-right">
                <VarianceBadge variance={row.variance} />
              </td>
              <td className="px-3 py-2">
                <ReconciliationStatusBadge status={row.status} />
              </td>
              <td className="px-3 py-2 text-right text-zinc-500">—</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
