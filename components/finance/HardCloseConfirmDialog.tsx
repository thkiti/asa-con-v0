"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import type { CloseChecklistItem } from "@/lib/finance/close-checklist-types"
import {
  buildCloseReadinessPath,
  type CloseReadinessResult,
} from "@/lib/finance-ui/close-readiness"
import { fetchCloseReadiness } from "@/lib/finance-ui/period-fetchers"
import type { AccountingPeriodRow } from "@/lib/finance-ui/types"
import { buildSnapshotDetailPath } from "@/lib/finance-ui/trace-links"
import { CloseGateBlockerList } from "./CloseGateBlockerList"
import { CloseReadinessStatusBadge } from "./CloseReadinessStatusBadge"

type HardCloseConfirmDialogProps = {
  period: AccountingPeriodRow
  open: boolean
  submitting?: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

function gateRelevantItems(items: CloseChecklistItem[]): CloseChecklistItem[] {
  return items.filter(
    (item) => item.severity === "BLOCKED" || item.severity === "WARNING"
  )
}

export function HardCloseConfirmDialog({
  period,
  open,
  submitting = false,
  onClose,
  onConfirm,
}: HardCloseConfirmDialogProps) {
  const [readiness, setReadiness] = useState<CloseReadinessResult | null>(null)
  const [loadingReadiness, setLoadingReadiness] = useState(false)
  const [readinessError, setReadinessError] = useState<string | null>(null)
  const [warningAcknowledged, setWarningAcknowledged] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setWarningAcknowledged(false)
    setReadiness(null)
    setReadinessError(null)
    setLoadingReadiness(true)

    void fetchCloseReadiness(period.id)
      .then((result) => {
        setReadiness(result.readiness)
      })
      .catch((err: unknown) => {
        setReadinessError(err instanceof Error ? err.message : "Request failed")
      })
      .finally(() => {
        setLoadingReadiness(false)
      })
  }, [open, period.id])

  const relevantItems = useMemo(
    () => (readiness ? gateRelevantItems(readiness.items) : []),
    [readiness]
  )

  const blockedItems = relevantItems.filter((item) => item.severity === "BLOCKED")
  const warningItems = relevantItems.filter((item) => item.severity === "WARNING")
  const isBlocked = readiness?.status === "BLOCKED"
  const isWarning = readiness?.status === "WARNING"
  const canConfirm =
    Boolean(readiness) &&
    !loadingReadiness &&
    !readinessError &&
    !isBlocked &&
    !submitting &&
    (!isWarning || warningAcknowledged)

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-200 bg-white p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hard-close-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="hard-close-title" className="text-lg font-semibold text-zinc-900">
              Confirm hard close
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Period {period.periodKey} · Branch {period.branchId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>

        <p className="mt-4 text-sm text-zinc-700">
          Hard close locks the period for routine posting. This action cannot be
          undone from this screen. Close readiness must pass before the server
          accepts hard close.
        </p>

        {loadingReadiness ? (
          <p className="mt-4 text-sm text-zinc-600">Loading close readiness…</p>
        ) : null}

        {readinessError ? (
          <p className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {readinessError}
          </p>
        ) : null}

        {readiness ? (
          <div className="mt-4 space-y-4">
            <section className="rounded border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-zinc-600">Close readiness</span>
                <CloseReadinessStatusBadge status={readiness.status} />
              </div>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-zinc-500">Blockers</dt>
                  <dd className="mt-1 font-medium text-red-800">
                    {readiness.blockerCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Warnings</dt>
                  <dd className="mt-1 font-medium text-amber-800">
                    {readiness.warningCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Frozen issues</dt>
                  <dd className="mt-1 font-medium text-zinc-900">
                    {readiness.metrics.issueCount}
                  </dd>
                </div>
              </dl>
              {readiness.latestSnapshotRef ? (
                <p className="mt-3 text-sm text-zinc-700">
                  Latest snapshot{" "}
                  <Link
                    href={buildSnapshotDetailPath(readiness.latestSnapshotRef.id)}
                    className="font-medium text-zinc-900 underline"
                  >
                    {readiness.latestSnapshotRef.label?.trim() ||
                      readiness.latestSnapshotRef.id}
                  </Link>{" "}
                  captured {readiness.latestSnapshotRef.createdAt}.
                </p>
              ) : (
                <p className="mt-3 text-sm text-amber-800">
                  No frozen reconciliation snapshot is linked to this period yet.
                </p>
              )}
              <Link
                href={buildCloseReadinessPath(period.id)}
                className="mt-3 inline-block text-sm font-medium text-zinc-900 underline"
              >
                Open full close readiness review
              </Link>
            </section>

            {isBlocked ? (
              <section className="rounded border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-900">
                  Hard close is blocked until all blockers are resolved.
                </p>
                <p className="mt-1 text-sm text-red-800">
                  Capture evidence, resolve reconciliation issues, then review
                  readiness before trying again.
                </p>
                <div className="mt-3">
                  <CloseGateBlockerList
                    blockers={blockedItems}
                    title="Blockers preventing hard close"
                    context={{
                      periodId: period.id,
                      branchId: period.branchId,
                      periodKey: period.periodKey,
                      latestSnapshotId: readiness.latestSnapshotRef?.id,
                      priorSnapshotId: readiness.priorSnapshotRef?.id,
                    }}
                    compact
                  />
                </div>
              </section>
            ) : null}

            {!isBlocked && warningItems.length > 0 ? (
              <section className="space-y-3">
                <p className="text-sm font-medium text-amber-900">
                  Warnings require acknowledgment before hard close
                </p>
<CloseGateBlockerList
                  blockers={warningItems}
                  title="Warnings to review before hard close"
                  readinessStatus={readiness.status}
                  context={{
                    periodId: period.id,
                    branchId: period.branchId,
                    periodKey: period.periodKey,
                    latestSnapshotId: readiness.latestSnapshotRef?.id,
                    priorSnapshotId: readiness.priorSnapshotRef?.id,
                  }}
                  compact
                />
                <label className="flex items-start gap-2 text-sm text-zinc-800">
                  <input
                    type="checkbox"
                    checked={warningAcknowledged}
                    onChange={(event) =>
                      setWarningAcknowledged(event.target.checked)
                    }
                    disabled={submitting}
                    className="mt-0.5"
                  />
                  <span>
                    I reviewed the warnings above and accept proceeding with hard
                    close.
                  </span>
                </label>
              </section>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => void onConfirm()}
            className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Closing…" : "Hard close period"}
          </button>
        </div>
      </div>
    </div>
  )
}
