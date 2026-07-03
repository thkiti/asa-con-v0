import Link from "next/link"
import { buildPeriodReviewPath } from "@/lib/finance-ui/period-review"
import type { AccountingPeriodRow } from "@/lib/finance-ui/types"
import {
  themeAdminTable,
  themeAdminTableCell,
  themeAdminTableCellMuted,
  themeAdminTableEmpty,
  themeAdminTableHead,
  themeAdminTableHeadCell,
  themeAdminTableRow,
  themeLinkPrimary,
} from "@/lib/finance-ui/finance-visual-classes"
import { PeriodStatusBadge } from "./PeriodStatusBadge"

function formatDate(value: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

type PeriodTableProps = {
  periods: AccountingPeriodRow[]
  className?: string
}

export function PeriodTable({ periods, className = "mt-4" }: PeriodTableProps) {
  return (
    <div className={`w-full overflow-x-auto ${className}`.trim()}>
      <table className={themeAdminTable}>
        <thead>
          <tr className={themeAdminTableHead}>
            <th className={themeAdminTableHeadCell}>Period</th>
            <th className={themeAdminTableHeadCell}>Status</th>
            <th className={themeAdminTableHeadCell}>Opened</th>
            <th className={themeAdminTableHeadCell}>Closed</th>
            <th className={themeAdminTableHeadCell}>Action</th>
          </tr>
        </thead>
        <tbody>
          {periods.length === 0 ? (
            <tr>
              <td colSpan={5} className={themeAdminTableEmpty}>
                No accounting periods
              </td>
            </tr>
          ) : (
            periods.map((period) => (
              <tr key={period.id} className={themeAdminTableRow}>
                <td className={`${themeAdminTableCell} font-medium`}>
                  <Link
                    href={buildPeriodReviewPath(period.id)}
                    className={themeLinkPrimary}
                  >
                    {period.periodKey}
                  </Link>
                </td>
                <td className={themeAdminTableCell}>
                  <PeriodStatusBadge status={period.status} />
                </td>
                <td className={themeAdminTableCellMuted}>
                  {formatDate(period.openedAt)}
                </td>
                <td className={themeAdminTableCellMuted}>
                  {formatDate(period.closedAt)}
                </td>
                <td className={themeAdminTableCell}>
                  <Link
                    href={buildPeriodReviewPath(period.id)}
                    className={`text-sm font-medium ${themeLinkPrimary}`}
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
