"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import {
  buildGeneralLedgerReportPath,
  buildOpeningBalanceJournalPath,
  buildTrialBalanceReportPath,
  fetchOpeningBalanceReview,
  formatOpeningBalanceJournalStatusLabel,
  formatOpeningBalanceReviewStatusLabel,
  type OpeningBalanceReviewResult,
} from "@/lib/finance-ui/opening-balance-review"
import { patchAccountingPeriod } from "@/lib/finance-ui/period-fetchers"
import { PeriodStatusBadge } from "./PeriodStatusBadge"
import {
  themeBannerError,
  themeBannerSuccess,
  themeLinkPrimary,
  themeLoadingText,
} from "@/lib/finance-ui/finance-visual-classes"

type OpeningBalanceReviewPageProps = {
  periodId: string
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function ChecklistIcon({ passed }: { passed: boolean }) {
  return (
    <span
      aria-hidden
      className={passed ? "text-green-700" : "text-red-700"}
    >
      {passed ? "✓" : "✕"}
    </span>
  )
}

export function OpeningBalanceReviewPage({ periodId }: OpeningBalanceReviewPageProps) {
  const router = useRouter()
  const [review, setReview] = useState<OpeningBalanceReviewResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [locking, setLocking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadReview = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const result = await fetchOpeningBalanceReview(periodId)
      setReview(result.review)
    } catch (err) {
      setReview(null)
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [periodId])

  useEffect(() => {
    void loadReview(false)
  }, [loadReview])

  async function handleLockOpeningPeriod() {
    if (!review) return
    setMessage(null)
    setError(null)
    setLocking(true)
    try {
      const result = await patchAccountingPeriod({
        periodKey: review.period.periodKey,
        action: "HARD_CLOSE",
      })
      if (result.hardCloseAdvance?.outcome === "created") {
        setMessage(
          `Opening balance period ${result.period.periodKey} is locked. Next period ${result.hardCloseAdvance.nextPeriodKey} opened automatically.`
        )
      } else if (result.hardCloseAdvance?.outcome === "warning") {
        setMessage(
          `Opening balance period ${result.period.periodKey} is locked. ${result.hardCloseAdvance.message}`
        )
      } else {
        setMessage(`Opening balance period ${result.period.periodKey} is locked.`)
      }
      router.push("/finance/periods")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLocking(false)
    }
  }

  if (loading && !review) {
    return <p className={themeLoadingText}>Loading opening balance review…</p>
  }

  if (error && !review) {
    return <p className={themeBannerError}>{error}</p>
  }

  if (!review) {
    return null
  }

  const journalHref = review.openingJournal.id
    ? buildOpeningBalanceJournalPath(review.openingJournal.id)
    : null
  const canLock =
    review.status === "READY" &&
    review.period.status !== "HARD_CLOSED" &&
    !locking

  return (
    <div className="w-full space-y-6">
      <section className="w-full rounded border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Accounting period
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-900">
              {review.period.periodKey}
            </h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-zinc-500">Opening Balance status</dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900">
                  {formatOpeningBalanceJournalStatusLabel(review.openingJournal.status)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Posted date</dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900">
                  {formatDate(review.openingJournal.postedAt)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-zinc-500">Journal reference</dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900">
                  {review.openingJournal.entryNo ?? "—"}
                  {review.openingJournal.voucherNo
                    ? ` · Voucher ${review.openingJournal.voucherNo}`
                    : null}
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodStatusBadge status={review.period.status} />
            <span
              className={`inline-block rounded px-2 py-0.5 text-sm font-medium ${
                review.status === "READY"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {formatOpeningBalanceReviewStatusLabel(review.status)}
            </span>
          </div>
        </div>
        <p className="mt-3 text-sm text-zinc-700">
          One-time bootstrap review before live accounting begins. This page does
          not run monthly close readiness checks.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {journalHref ? (
            <Link
              href={journalHref}
              className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-white"
            >
              Review Opening Journal
            </Link>
          ) : (
            <Link
              href="/finance/opening-balance"
              className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-white"
            >
              Review Opening Journal
            </Link>
          )}
          <Link
            href={buildTrialBalanceReportPath(review.period.periodKey)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-white"
          >
            Trial Balance
          </Link>
          <Link
            href={buildGeneralLedgerReportPath(review.period.periodKey)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-white"
          >
            General Ledger
          </Link>
          <button
            type="button"
            disabled={!canLock}
            onClick={() => void handleLockOpeningPeriod()}
            className="rounded border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {locking ? "Locking…" : "Lock Opening Period"}
          </button>
          <Link
            href="/finance/periods"
            className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-white"
          >
            Back to Periods
          </Link>
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void loadReview(true)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-white disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh checklist"}
          </button>
        </div>
      </section>

      {message ? <p className={themeBannerSuccess}>{message}</p> : null}
      {error ? <p className={themeBannerError}>{error}</p> : null}

      <section className="w-full rounded border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-medium text-zinc-900">Checklist</h2>
        <ul className="mt-3 space-y-3">
          {review.items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded border border-zinc-200 p-3"
            >
              <ChecklistIcon passed={item.passed} />
              <div>
                <p className="text-sm font-medium text-zinc-900">{item.title}</p>
                <p className="mt-1 text-sm text-zinc-700">{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>
        {journalHref ? (
          <p className="mt-4 text-sm text-zinc-600">
            Need to inspect posting lines?{" "}
            <Link href={journalHref} className={themeLinkPrimary}>
              Open opening balance journal
            </Link>
          </p>
        ) : null}
      </section>
    </div>
  )
}
