import Link from "next/link"
import type { PeriodAction } from "@/lib/finance-ui/period-fetchers"
import {
  buildCloseEvidenceHistoryPath,
  buildCloseEvidencePath,
} from "@/lib/finance-ui/close-evidence"
import { buildReopenEvidencePath } from "@/lib/finance-ui/reopen-evidence"
import { buildReopenRequestsPath } from "@/lib/finance-ui/reopen-requests"
import type { ReopenRequestDetail } from "@/lib/finance-ui/reopen-requests"
import { buildCloseReadinessPath } from "@/lib/finance-ui/close-readiness"
import { buildPeriodAuditTimelinePath } from "@/lib/finance-ui/period-audit-timeline"
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
    action: PeriodAction,
    options?: { reason?: string }
  ) => Promise<void>
  onReopenRequest?: (period: AccountingPeriodRow, reason: string) => Promise<void>
  pendingReopenRequests?: Record<string, ReopenRequestDetail>
  sessionRole?: string
  actionsDisabled?: boolean
  pendingPeriodId?: string | null
}

export function PeriodTable({
  periods,
  showControls = false,
  onPeriodAction,
  onReopenRequest,
  pendingReopenRequests = {},
  sessionRole,
  actionsDisabled = false,
  pendingPeriodId = null,
}: PeriodTableProps) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className={themeAdminTable}>
        <thead>
          <tr className={themeAdminTableHead}>
            <th className={themeAdminTableHeadCell}>Period</th>
            <th className={themeAdminTableHeadCell}>Entity</th>
            <th className={themeAdminTableHeadCell}>Status</th>
            <th className={themeAdminTableHeadCell}>Opened</th>
            <th className={themeAdminTableHeadCell}>Closed</th>
            <th className={themeAdminTableHeadCell}>Close review</th>
            {showControls ? (
              <th className={themeAdminTableHeadCell}>Actions</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {periods.length === 0 ? (
            <tr>
              <td colSpan={showControls ? 7 : 6} className={themeAdminTableEmpty}>
                No accounting periods
              </td>
            </tr>
          ) : (
            periods.map((period) => (
              <tr key={period.id} className={themeAdminTableRow}>
                <td className={`${themeAdminTableCell} font-medium`}>{period.periodKey}</td>
                <td className={themeAdminTableCell}>{period.legalEntityCode}</td>
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
                  <span className="flex flex-wrap items-center gap-3">
                    <Link
                      href={buildCloseReadinessPath(period.id)}
                      className={`text-sm font-medium ${themeLinkPrimary}`}
                    >
                      Review
                    </Link>
                    {period.status === "HARD_CLOSED" ? (
                      <>
                        <Link
                          href={buildCloseEvidencePath(period.id)}
                          className={`text-sm font-medium ${themeLinkPrimary}`}
                        >
                          Close evidence
                        </Link>
                        <Link
                          href={buildCloseEvidenceHistoryPath(period.id)}
                          className={`text-sm font-medium ${themeLinkPrimary}`}
                        >
                          Close history
                        </Link>
                      </>
                    ) : null}
                    <Link
                      href={buildPeriodAuditTimelinePath(period.id)}
                      className={`text-sm font-medium ${themeLinkPrimary}`}
                    >
                      Audit timeline
                    </Link>
                    <Link
                      href={buildReopenEvidencePath(period.id)}
                      className={`text-sm font-medium ${themeLinkPrimary}`}
                    >
                      Reopen history
                    </Link>
                    {period.status === "HARD_CLOSED" ? (
                      <Link
                        href={buildReopenRequestsPath(period.id)}
                        className={`text-sm font-medium ${themeLinkPrimary}`}
                      >
                        Reopen requests
                      </Link>
                    ) : null}
                  </span>
                </td>
                {showControls ? (
                  <td className={themeAdminTableCell}>
                    <PeriodAdminActions
                      period={period}
                      sessionRole={sessionRole}
                      pendingReopenRequest={pendingReopenRequests[period.id] ?? null}
                      disabled={actionsDisabled}
                      submitting={
                        Boolean(pendingPeriodId) && pendingPeriodId === period.id
                      }
                      onAction={(action, options) =>
                        onPeriodAction
                          ? onPeriodAction(period, action, options)
                          : Promise.resolve()
                      }
                      onReopenRequest={
                        onReopenRequest
                          ? (reason) => onReopenRequest(period, reason)
                          : undefined
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
