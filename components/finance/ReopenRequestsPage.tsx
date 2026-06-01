"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  fetchReopenRequests,
  fetchSessionDisplay,
  patchReopenRequest,
} from "@/lib/finance-ui/period-fetchers"
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
    return <p className="text-zinc-600">Loading reopen requests…</p>
  }

  return (
    <div>
      <p className="text-sm text-zinc-600">
        <Link href={buildReopenEvidencePath(periodId)} className="underline">
          View executed reopen evidence
        </Link>
      </p>

      {message ? (
        <p className="mt-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">No reopen requests for this period.</p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-100 rounded border border-zinc-200">
          {rows.map((row) => (
            <li key={row.id} className="px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {row.requestNo} · {row.fromStatus} → {row.toStatus} · {row.status}
                  </p>
                  <p className="mt-1 text-sm text-zinc-700">{row.reason}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Requested {formatDateTime(row.requestedAt)} by {row.requestedByName} (
                    {row.requestedByRole})
                  </p>
                  {row.status === "EXECUTED" && row.approvedAt ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      Approved {formatDateTime(row.approvedAt)} by {row.approvedByName} (
                      {row.approvedByRole})
                      {row.approvalNote ? ` — ${row.approvalNote}` : ""}
                    </p>
                  ) : null}
                  {row.status === "REJECTED" && row.rejectedAt ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      Rejected {formatDateTime(row.rejectedAt)} by {row.rejectedByName} (
                      {row.rejectedByRole})
                      {row.rejectionNote ? ` — ${row.rejectionNote}` : ""}
                    </p>
                  ) : null}
                  {row.status === "CANCELLED" && row.cancelledAt ? (
                    <p className="mt-1 text-xs text-zinc-500">
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
                          className="rounded border border-green-300 bg-green-50 px-2 py-1 text-sm hover:bg-green-100 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={submittingId === row.id}
                          onClick={() => void handleAction(row, "REJECT")}
                          className="rounded border border-red-300 bg-red-50 px-2 py-1 text-sm hover:bg-red-100 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      disabled={submittingId === row.id}
                      onClick={() => void handleAction(row, "CANCEL")}
                      className="rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 disabled:opacity-50"
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
