"use client"

import { useState } from "react"
import { patchPeriodStatus } from "@/lib/finance-ui/period-fetchers"
import type { AccountingPeriodStatus } from "@/lib/finance-ui/types"

const STATUS_OPTIONS: AccountingPeriodStatus[] = [
  "OPEN",
  "SOFT_CLOSED",
  "HARD_CLOSED",
]

type PeriodStatusControlProps = {
  periodId: string
  currentStatus: AccountingPeriodStatus
  onSuccess?: () => void
}

export function PeriodStatusControl({
  periodId,
  currentStatus,
  onSuccess,
}: PeriodStatusControlProps) {
  const [nextStatus, setNextStatus] =
    useState<AccountingPeriodStatus>(currentStatus)
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (currentStatus === "HARD_CLOSED") {
    return <span className="text-sm text-zinc-500">Locked</span>
  }

  async function handleSubmit() {
    setSubmitting(true)
    setMessage(null)
    setError(null)
    try {
      const result = await patchPeriodStatus(periodId, {
        nextStatus,
        reason: reason.trim() || undefined,
      })
      setMessage(`Status updated to ${result.status}`)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = !submitting

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={nextStatus}
          onChange={(e) =>
            setNextStatus(e.target.value as AccountingPeriodStatus)
          }
          className="rounded border border-zinc-300 px-2 py-1 text-sm"
          disabled={submitting}
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="min-w-[10rem] flex-1 rounded border border-zinc-300 px-2 py-1 text-sm"
          disabled={submitting}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="rounded bg-zinc-900 px-3 py-1 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Updating…" : "Update status"}
        </button>
      </div>
      {error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : message ? (
        <p className="text-sm text-green-700">{message}</p>
      ) : null}
    </div>
  )
}
