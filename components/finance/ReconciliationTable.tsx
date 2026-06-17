import { formatAmount } from "@/lib/finance-ui/format"
import type { ReconciliationVariance } from "@/lib/finance-ui/types"
import { numericCell, numericTh } from "@/lib/ui/numeric-display"
import { VarianceBadge } from "./VarianceBadge"

type ReconciliationTableProps = {
  rows: ReconciliationVariance[]
  showReason?: boolean
}

export function ReconciliationTable({
  rows,
  showReason = true,
}: ReconciliationTableProps) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-zinc-600">
            <th className="px-3 py-2 font-medium">Domain</th>
            <th className="px-3 py-2 font-medium">Label</th>
            <th className={`px-3 py-2 font-medium ${numericTh}`}>Operational</th>
            <th className={`px-3 py-2 font-medium ${numericTh}`}>GL</th>
            <th className={`px-3 py-2 font-medium ${numericTh}`}>Variance</th>
            {showReason ? (
              <th className="px-3 py-2 font-medium">Reason</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={showReason ? 6 : 5}
                className="px-3 py-4 text-center text-zinc-500"
              >
                No variances
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={`${row.domain}-${row.label}`}
                className="border-b border-zinc-100"
              >
                <td className="px-3 py-2">{row.domain}</td>
                <td className="px-3 py-2">{row.label}</td>
                <td className={`px-3 py-2 ${numericCell}`}>
                  {formatAmount(row.operationalAmount)}
                </td>
                <td className={`px-3 py-2 ${numericCell}`}>
                  {formatAmount(row.glAmount)}
                </td>
                <td className={`px-3 py-2 ${numericCell}`}>
                  <VarianceBadge variance={row.variance} />
                </td>
                {showReason ? (
                  <td className="px-3 py-2 text-zinc-600">
                    {row.varianceReason ?? "—"}
                  </td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
