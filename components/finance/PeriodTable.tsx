import Link from "next/link"
import type { PeriodAction } from "@/lib/finance-ui/period-fetchers"
import { buildCloseReadinessPath } from "@/lib/finance-ui/close-readiness"
import type { AccountingPeriodRow } from "@/lib/finance-ui/types"
import { PeriodAdminActions } from "./PeriodAdminActions"
import { PeriodStatusBadge } from "./PeriodStatusBadge"

function formatDate(value: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

type PeriodTableProps = {
  periods: AccountingPeriodRow[]
  showControls?: boolean
  onPeriodAction?: (
    period: AccountingPeriodRow,
    action: PeriodAction
  ) => Promise<void>
  actionsDisabled?: boolean
}

export function PeriodTable({
  periods,
  showControls = false,
  onPeriodAction,
  actionsDisabled = false,
}: PeriodTableProps) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-zinc-600">
            <th className="px-3 py-2 font-medium">Period</th>
            <th className="px-3 py-2 font-medium">Branch</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Opened</th>
            <th className="px-3 py-2 font-medium">Closed</th>
            <th className="px-3 py-2 font-medium">Close readiness</th>
            {showControls ? (
              <th className="px-3 py-2 font-medium">Actions</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {periods.length === 0 ? (
            <tr>
              <td
                colSpan={showControls ? 7 : 6}
                className="px-3 py-4 text-center text-zinc-500"
              >
                No accounting periods
              </td>
            </tr>
          ) : (
            periods.map((period) => (
              <tr key={period.id} className="border-b border-zinc-100">
                <td className="px-3 py-2 font-medium">{period.periodKey}</td>
                <td className="px-3 py-2">
                  <span className="block">{period.branchName}</span>
                  <span className="text-xs text-zinc-500">{period.branchId}</span>
                </td>
                <td className="px-3 py-2">
                  <PeriodStatusBadge status={period.status} />
                </td>
                <td className="px-3 py-2 text-zinc-600">
                  {formatDate(period.openedAt)}
                </td>
                <td className="px-3 py-2 text-zinc-600">
                  {formatDate(period.closedAt)}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={buildCloseReadinessPath(period.id)}
                    className="text-sm font-medium text-zinc-900 underline"
                  >
                    Review
                  </Link>
                </td>
                {showControls ? (
                  <td className="px-3 py-2">
                    <PeriodAdminActions
                      period={period}
                      disabled={actionsDisabled}
                      onAction={(action) =>
                        onPeriodAction
                          ? onPeriodAction(period, action)
                          : Promise.resolve()
                      }
                    />
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
