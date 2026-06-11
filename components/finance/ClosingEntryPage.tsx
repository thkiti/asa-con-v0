"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import type { PreviewClosingEntryResult } from "@/lib/finance/closing-entry-types"
import {
  fetchClosingEntryPreview,
  formatClosingEntryStatus,
  postClosingEntryForPeriod,
} from "@/lib/finance-ui/closing-entry"
import { PeriodStatusBadge } from "./PeriodStatusBadge"

type ClosingEntryPageProps = {
  periodId: string
}

export function ClosingEntryPage({ periodId }: ClosingEntryPageProps) {
  const [preview, setPreview] = useState<PreviewClosingEntryResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [postMessage, setPostMessage] = useState<string | null>(null)

  const loadPreview = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchClosingEntryPreview(periodId)
      setPreview(result.preview)
    } catch (err) {
      setPreview(null)
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }, [periodId])

  useEffect(() => {
    void loadPreview()
  }, [loadPreview])

  async function handlePost() {
    setPosting(true)
    setPostMessage(null)
    setError(null)
    try {
      const result = await postClosingEntryForPeriod(periodId)
      const posted = result.posted
      if (!posted.posted && posted.reason === "NOT_REQUIRED") {
        setPostMessage("No closing entry required for this period.")
      } else if (posted.alreadyPosted) {
        setPostMessage(`Closing entry already posted (${posted.voucherNo}).`)
      } else {
        setPostMessage(`Closing entry posted (${posted.voucherNo}).`)
      }
      await loadPreview()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Post failed")
    } finally {
      setPosting(false)
    }
  }

  if (loading && !preview) {
    return <p className="text-zinc-600">Loading closing entry preview…</p>
  }

  if (error && !preview) {
    return (
      <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </p>
    )
  }

  if (!preview) {
    return null
  }

  const simulation = preview.simulation

  return (
    <div className="space-y-6">
      <section className="rounded border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Accounting period
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-900">
              {preview.periodKey}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">Branch {preview.branchId}</p>
          </div>
          <PeriodStatusBadge status={preview.periodStatus} />
        </div>
        <p className="mt-3 text-sm text-zinc-700">
          Active closing entry: {formatClosingEntryStatus(preview.activeEntry)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!preview.canPost || posting}
            onClick={() => void handlePost()}
            className="rounded border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {posting ? "Posting…" : "Post closing entry"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadPreview()}
            className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-white disabled:opacity-50"
          >
            Refresh preview
          </button>
          <Link
            href={`/finance/periods/${encodeURIComponent(periodId)}/close-readiness`}
            className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-white"
          >
            Close readiness
          </Link>
        </div>
      </section>

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {postMessage ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {postMessage}
        </p>
      ) : null}

      <section className="rounded border border-zinc-200 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Preview summary</h3>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Net income</dt>
            <dd className="font-medium text-zinc-900">{simulation.netIncome}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Required</dt>
            <dd className="font-medium text-zinc-900">
              {simulation.isRequired ? "Yes" : "No"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Total debit</dt>
            <dd className="font-medium text-zinc-900">{simulation.totalDebit}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Total credit</dt>
            <dd className="font-medium text-zinc-900">{simulation.totalCredit}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Balanced</dt>
            <dd className="font-medium text-zinc-900">
              {simulation.isBalanced ? "Yes" : "No"}
            </dd>
          </div>
        </dl>
      </section>

      {simulation.lines.length > 0 ? (
        <section className="overflow-x-auto rounded border border-zinc-200">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2">Debit</th>
                <th className="px-3 py-2">Credit</th>
                <th className="px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {simulation.lines.map((line, index) => (
                <tr key={`${line.accountCode}-${index}`} className="border-b border-zinc-100">
                  <td className="px-3 py-2">
                    <span className="font-medium">{line.accountCode}</span>
                    <span className="ml-2 text-zinc-600">{line.accountName}</span>
                  </td>
                  <td className="px-3 py-2">{line.debit}</td>
                  <td className="px-3 py-2">{line.credit}</td>
                  <td className="px-3 py-2 text-zinc-600">{line.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <p className="text-sm text-zinc-600">No closing lines required for this period.</p>
      )}
    </div>
  )
}
