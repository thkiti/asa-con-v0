"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  fetchReopenRequests,
  fetchSessionDisplay,
  patchReopenRequest,
} from "@/lib/finance-ui/period-fetchers"
import {
  themeBannerError,
  themeBannerSuccess,
  themeBtnDanger,
  themeBtnSecondary,
  themeBtnSuccess,
  themeEmptyState,
  themeLinkPrimary,
  themeLoadingText,
  themeMeta,
  themePanelList,
  themePanelListItem,
  themeTextPrimary,
  themeTextSecondary,
} from "@/lib/finance-ui/finance-visual-classes"
import type { ReopenRequestDetail } from "@/lib/finance-ui/reopen-requests"
import { buildReopenEvidencePath } from "@/lib/finance-ui/reopen-evidence"

function formatDateTime(value: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

type ReopenRequestsPageProps = {
  periodId: string
}

export function ReopenRequestsPage({ periodId }: ReopenRequestsPageProps) {
  const [rows, setRows] = useState<ReopenRequestDetail[]>([])
  const [sessionRole, setSessionRole] = useState("")
  const [loading, setLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchReopenRequests(periodId)
      setRows(result.requests)
    } catch (err) {
      setRows([])
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }, [periodId])

  useEffect(() => {
    void loadRequests()
    void fetchSessionDisplay().then((session) => {
      setSessionRole(session?.role ?? "")
    })
  }, [loadRequests])

  const isHoAdmin = sessionRole.trim().toUpperCase() === "HO_ADMIN"

  async function handleAction(
    request: ReopenRequestDetail,
    action: "APPROVE" | "REJECT" | "CANCEL"
  ) {
    setMessage(null)
    setError(null)
    setSubmittingId(request.id)
    try {
      const note =
        action === "APPROVE"
          ? window.prompt("Approval note (optional)") ?? undefined
          : action === "REJECT"
            ? window.prompt("Rejection reason (optional)") ?? undefined
            : undefined

      await patchReopenRequest({
        periodId,
        requestId: request.id,
        action,
        approvalNote: action === "APPROVE" ? note : undefined,
        rejectionNote: action === "REJECT" ? note : undefined,
      })

      setMessage(
        action === "APPROVE"
          ? `Request ${request.requestNo} approved and executed`
          : action === "REJECT"
            ? `Request ${request.requestNo} rejected`
            : `Request ${request.requestNo} cancelled`
      )
      await loadRequests()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setSubmittingId(null)
    }
  }

  if (loading) {
    return <p className={themeLoadingText}>Loading reopen requests…</p>
  }

  return (
    <div>
      <p className={`text-sm ${themeTextSecondary}`}>
        <Link href={buildReopenEvidencePath(periodId)} className={themeLinkPrimary}>
          View executed reopen evidence
        </Link>
      </p>

      {message ? <p className={`mt-4 ${themeBannerSuccess}`}>{message}</p> : null}

      {error ? <p className={`mt-4 ${themeBannerError}`}>{error}</p> : null}

      {rows.length === 0 ? (
        <p className={`mt-4 ${themeEmptyState}`}>No reopen requests for this period.</p>
      ) : (
        <ul className={`mt-4 ${themePanelList}`}>
          {rows.map((row) => (
            <li key={row.id} className={themePanelListItem}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className={`text-sm font-medium ${themeTextPrimary}`}>
                    {row.requestNo} · {row.fromStatus} → {row.toStatus} · {row.status}
                  </p>
                  <p className={`mt-1 text-sm ${themeTextSecondary}`}>{row.reason}</p>
                  <p className={`mt-1 ${themeMeta}`}>
                    Requested {formatDateTime(row.requestedAt)} by {row.requestedByName} (
                    {row.requestedByRole})
                  </p>
                  {row.status === "EXECUTED" && row.approvedAt ? (
                    <p className={`mt-1 ${themeMeta}`}>
                      Approved {formatDateTime(row.approvedAt)} by {row.approvedByName} (
                      {row.approvedByRole})
                      {row.approvalNote ? ` — ${row.approvalNote}` : ""}
                    </p>
                  ) : null}
                  {row.status === "REJECTED" && row.rejectedAt ? (
                    <p className={`mt-1 ${themeMeta}`}>
                      Rejected {formatDateTime(row.rejectedAt)} by {row.rejectedByName} (
                      {row.rejectedByRole})
                      {row.rejectionNote ? ` — ${row.rejectionNote}` : ""}
                    </p>
                  ) : null}
                  {row.status === "CANCELLED" && row.cancelledAt ? (
                    <p className={`mt-1 ${themeMeta}`}>
                      Cancelled {formatDateTime(row.cancelledAt)} by {row.cancelledByName}
                    </p>
                  ) : null}
                </div>
                {row.status === "PENDING" ? (
                  <div className="flex flex-wrap gap-2">
                    {isHoAdmin ? (
                      <>
                        <button
                          type="button"
                          disabled={submittingId === row.id}
                          onClick={() => void handleAction(row, "APPROVE")}
                          className={themeBtnSuccess}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={submittingId === row.id}
                          onClick={() => void handleAction(row, "REJECT")}
                          className={themeBtnDanger}
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      disabled={submittingId === row.id}
                      onClick={() => void handleAction(row, "CANCEL")}
                      className={themeBtnSecondary}
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
