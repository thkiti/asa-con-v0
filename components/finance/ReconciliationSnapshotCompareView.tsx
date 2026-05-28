"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  fetchReconciliationSnapshotById,
  fetchReconciliationSnapshots,
} from "@/lib/finance-ui/fetchers"
import { formatAmount, formatDateTime } from "@/lib/finance-ui/format"
import {
  buildCompareEvidenceExport,
  downloadEvidenceCsvFiles,
} from "@/lib/finance-ui/reconciliation-export"
import { downloadCsv } from "@/lib/finance-ui/reconciliation-snapshots"
import {
  computeSnapshotCompareResult,
  filterDashboardRowDiffs,
  filterIssueDiffs,
  formatSnapshotDisplayTitle,
  formatSnapshotKindLabel,
  formatSnapshotScope,
  paginateList,
  SNAPSHOT_UI_ISSUES_PAGE_SIZE,
  type DashboardRowDiff,
  type DashboardRowDiffKind,
  type IssueDiff,
  type IssueDiffKind,
  type SnapshotCompareResult,
} from "@/lib/finance-ui/reconciliation-snapshots"
import type { ReconciliationSnapshotDetail, ReconciliationSnapshotHeader } from "@/lib/finance-ui/types"
import {
  CollapsibleSection,
  CompareAuditPrintHeader,
  CompareSkeleton,
  DeltaChip,
  DiffKindBadge,
  PrintAuditButton,
} from "./reconciliation-snapshot-ui"
import { ReconciliationStatusBadge } from "./ReconciliationStatusBadge"

function SnapshotCard({
  label,
  snapshot,
}: {
  label: string
  snapshot: ReconciliationSnapshotDetail
}) {
  return (
    <div className="rounded border border-zinc-200 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Link
          href={`/finance/reconciliation/snapshots/${snapshot.id}`}
          className="font-medium text-zinc-900 underline decoration-zinc-300 hover:decoration-zinc-600"
        >
          {formatSnapshotDisplayTitle(snapshot)}
        </Link>
        <span className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-700">
          {formatSnapshotKindLabel(snapshot.kind)}
        </span>
      </div>
      <p className="mt-1 text-sm text-zinc-600">
        {formatSnapshotScope(snapshot)} · captured{" "}
        <time dateTime={snapshot.createdAt}>{formatDateTime(snapshot.createdAt)}</time>
      </p>
    </div>
  )
}

type SnapshotPickerProps = {
  snapshots: ReconciliationSnapshotHeader[] | null
  leftId: string
  rightId: string
  onLeftChange: (value: string) => void
  onRightChange: (value: string) => void
  onCompare: () => void
}

function SnapshotPicker({
  snapshots,
  leftId,
  rightId,
  onLeftChange,
  onRightChange,
  onCompare,
}: SnapshotPickerProps) {
  const options = snapshots ?? []
  const canCompare = Boolean(leftId && rightId && leftId !== rightId)

  return (
    <div className="rounded border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-sm text-zinc-700">
        Select two snapshots to compare frozen payloads client-side.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-zinc-600">
          Left (baseline)
          <select
            value={leftId}
            onChange={(event) => onLeftChange(event.target.value)}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          >
            <option value="">Choose snapshot…</option>
            {options.map((snapshot) => (
              <option key={snapshot.id} value={snapshot.id}>
                {formatSnapshotDisplayTitle(snapshot)} ({formatDateTime(snapshot.createdAt)})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-600">
          Right (later)
          <select
            value={rightId}
            onChange={(event) => onRightChange(event.target.value)}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          >
            <option value="">Choose snapshot…</option>
            {options.map((snapshot) => (
              <option key={snapshot.id} value={snapshot.id}>
                {formatSnapshotDisplayTitle(snapshot)} ({formatDateTime(snapshot.createdAt)})
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        disabled={!canCompare}
        onClick={onCompare}
        className="mt-4 rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
      >
        Compare
      </button>
    </div>
  )
}


type CompareEvidenceExportControlsProps = {
  left: ReconciliationSnapshotDetail
  right: ReconciliationSnapshotDetail
  compareResult: SnapshotCompareResult
}

function CompareEvidenceExportControls({
  left,
  right,
  compareResult,
}: CompareEvidenceExportControlsProps) {
  const [exporting, setExporting] = useState(false)

  const evidenceFiles = useMemo(
    () =>
      buildCompareEvidenceExport({
        left,
        right,
        compare: compareResult,
      }),
    [left, right, compareResult]
  )

  async function handleExportPack() {
    setExporting(true)
    try {
      await downloadEvidenceCsvFiles(evidenceFiles)
    } finally {
      setExporting(false)
    }
  }

  function handleExportSingle(index: number) {
    const file = evidenceFiles[index]
    if (!file) return
    downloadCsv(file.filename, file.content)
  }

  return (
    <div className="no-print rounded border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-900">Compare evidence export</p>
          <p className="mt-1 text-xs text-zinc-600">
            Frozen compare diff only — metadata, summary deltas, and changed rows/issues.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintAuditButton />
          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleExportPack()}
            className="rounded border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {exporting ? "Exporting…" : "Export compare evidence"}
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleExportSingle(0)}
          className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900"
        >
          Metadata CSV
        </button>
        <button
          type="button"
          onClick={() => handleExportSingle(1)}
          className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900"
        >
          Summary CSV
        </button>
        <button
          type="button"
          onClick={() => handleExportSingle(2)}
          className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900"
        >
          Dashboard changes CSV
        </button>
        <button
          type="button"
          onClick={() => handleExportSingle(3)}
          className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900"
        >
          Issue changes CSV
        </button>
      </div>
    </div>
  )
}

function CompareRowDiffTable({ diffs }: { diffs: DashboardRowDiff[] }) {
  if (diffs.length === 0) {
    return <p className="mt-4 text-sm text-zinc-600">No dashboard row changes.</p>
  }

  return (
    <div className="mt-4 overflow-x-auto rounded border border-zinc-200">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-zinc-50">
          <tr className="border-b border-zinc-200 text-left text-zinc-600">
            <th className="px-3 py-2 font-medium">Change</th>
            <th className="px-3 py-2 font-medium">Reference</th>
            <th className="px-3 py-2 font-medium">Left</th>
            <th className="px-3 py-2 font-medium">Right</th>
          </tr>
        </thead>
        <tbody>
          {diffs.map((diff) => {
            const leftRow = diff.left
            const rightRow = diff.right
            const reference =
              rightRow?.reference ?? leftRow?.reference ?? diff.id
            return (
              <tr key={diff.id} className="border-b border-zinc-100 align-top">
                <td className="px-3 py-2">
                  <DiffKindBadge kind={diff.kind} />
                </td>
                <td className="px-3 py-2">
                  <p className="font-medium text-zinc-900">{reference}</p>
                  {diff.changedFields?.length ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      Changed: {diff.changedFields.join(", ")}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-zinc-700">
                  {leftRow ? (
                    <div className="space-y-1">
                      <p className="tabular-nums">
                        {formatAmount(leftRow.expectedAmount)} /{" "}
                        {formatAmount(leftRow.actualAmount)}
                      </p>
                      <ReconciliationStatusBadge status={leftRow.status} />
                    </div>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-zinc-700">
                  {rightRow ? (
                    <div className="space-y-1">
                      <p className="tabular-nums">
                        {formatAmount(rightRow.expectedAmount)} /{" "}
                        {formatAmount(rightRow.actualAmount)}
                      </p>
                      <ReconciliationStatusBadge status={rightRow.status} />
                    </div>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function CompareIssueDiffTable({ diffs }: { diffs: IssueDiff[] }) {
  if (diffs.length === 0) {
    return <p className="mt-4 text-sm text-zinc-600">No issue changes.</p>
  }

  return (
    <div className="mt-4 overflow-x-auto rounded border border-zinc-200">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-zinc-50">
          <tr className="border-b border-zinc-200 text-left text-zinc-600">
            <th className="px-3 py-2 font-medium">Change</th>
            <th className="px-3 py-2 font-medium">Issue</th>
            <th className="px-3 py-2 font-medium">Left</th>
            <th className="px-3 py-2 font-medium">Right</th>
          </tr>
        </thead>
        <tbody>
          {diffs.map((diff) => {
            const leftIssue = diff.left
            const rightIssue = diff.right
            const label =
              rightIssue?.documentRef ??
              leftIssue?.documentRef ??
              diff.id
            return (
              <tr key={diff.id} className="border-b border-zinc-100 align-top">
                <td className="px-3 py-2">
                  <DiffKindBadge kind={diff.kind} />
                </td>
                <td className="px-3 py-2">
                  <p className="font-medium text-zinc-900">{label}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {rightIssue?.issueType ?? leftIssue?.issueType}
                  </p>
                  {diff.changedFields?.length ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      Changed: {diff.changedFields.join(", ")}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-zinc-700">
                  {leftIssue ? (
                    <p className="text-sm">{leftIssue.message}</p>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-zinc-700">
                  {rightIssue ? (
                    <p className="text-sm">{rightIssue.message}</p>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

type ReconciliationSnapshotCompareViewProps = {
  left: ReconciliationSnapshotDetail
  right: ReconciliationSnapshotDetail
}

export function ReconciliationSnapshotCompareView({
  left,
  right,
}: ReconciliationSnapshotCompareViewProps) {
  const [rowDiffFilter, setRowDiffFilter] = useState<"all" | DashboardRowDiffKind>("all")
  const [issueDiffFilter, setIssueDiffFilter] = useState<"all" | IssueDiffKind>("all")
  const [issueDiffVisibleCount, setIssueDiffVisibleCount] = useState(
    SNAPSHOT_UI_ISSUES_PAGE_SIZE
  )

  const compareResult = useMemo(
    () => computeSnapshotCompareResult(left, right),
    [left, right]
  )
  const { metrics, rowDiffs, issueDiffs, rowCounts, issueCounts } = compareResult

  const visibleRowDiffs = useMemo(
    () => filterDashboardRowDiffs(rowDiffs, rowDiffFilter),
    [rowDiffs, rowDiffFilter]
  )
  const filteredIssueDiffs = useMemo(
    () => filterIssueDiffs(issueDiffs, issueDiffFilter),
    [issueDiffs, issueDiffFilter]
  )

  useEffect(() => {
    setIssueDiffVisibleCount(SNAPSHOT_UI_ISSUES_PAGE_SIZE)
  }, [issueDiffFilter])

  const issueDiffPagination = useMemo(
    () => paginateList(filteredIssueDiffs, issueDiffVisibleCount),
    [filteredIssueDiffs, issueDiffVisibleCount]
  )
  const visibleIssueDiffs = issueDiffPagination.visible

  return (
    <div className="reconciliation-audit-print space-y-4">
      <CompareAuditPrintHeader left={left} right={right} />

      <p className="no-print rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Client-side diff of frozen payloads only — no live reconciliation fetch.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <SnapshotCard label="Left snapshot" snapshot={left} />
        <SnapshotCard label="Right snapshot" snapshot={right} />
      </div>

      <CompareEvidenceExportControls
        left={left}
        right={right}
        compareResult={compareResult}
      />

      <div className="sticky top-0 z-20 -mx-1 border border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Header metric deltas (right − left)
        </p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {(
            [
              ["Matched", metrics.matchedCount],
              ["Variance rows", metrics.varianceCount],
              ["Issues", metrics.issueCount],
              ["Dashboard rows", metrics.dashboardRowCount],
              ["Total variance", metrics.totalVarianceAmount],
            ] as const
          ).map(([label, metric]) => (
            <div key={label}>
              <dt className="text-xs text-zinc-500">{label}</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm tabular-nums text-zinc-700">
                  {String(metric.left)} → {String(metric.right)}
                </span>
                <DeltaChip
                  delta={metric.delta}
                  amount={label === "Total variance"}
                />
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <CollapsibleSection title={`Dashboard row changes (${rowCounts.added + rowCounts.removed + rowCounts.changed})`}>
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-xs text-zinc-600">
            <span>{rowCounts.added} added</span>
            <span>{rowCounts.removed} removed</span>
            <span>{rowCounts.changed} changed</span>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            Filter
            <select
              value={rowDiffFilter}
              onChange={(event) =>
                setRowDiffFilter(event.target.value as "all" | DashboardRowDiffKind)
              }
              className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
            >
              <option value="all">All changes</option>
              <option value="added">Added</option>
              <option value="removed">Removed</option>
              <option value="changed">Changed</option>
            </select>
          </label>
        </div>
        <div className="no-print">
          {visibleRowDiffs.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600">No dashboard row changes for this filter.</p>
          ) : (
            <CompareRowDiffTable diffs={visibleRowDiffs} />
          )}
        </div>
        <div className="print-only print-break-before">
          <p className="mb-3 text-sm text-zinc-600">
            All dashboard row changes ({rowDiffs.length})
          </p>
          <CompareRowDiffTable diffs={rowDiffs} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title={`Issue changes
 (${issueCounts.added + issueCounts.removed + issueCounts.changed})`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-xs text-zinc-600">
            <span>{issueCounts.added} added</span>
            <span>{issueCounts.removed} removed</span>
            <span>{issueCounts.changed} changed</span>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            Filter
            <select
              value={issueDiffFilter}
              onChange={(event) =>
                setIssueDiffFilter(event.target.value as "all" | IssueDiffKind)
              }
              className="rounded border border-zinc-300 px-3 py-2 text-zinc-900"
            >
              <option value="all">All changes</option>
              <option value="added">Added</option>
              <option value="removed">Removed</option>
              <option value="changed">Changed</option>
            </select>
          </label>
        </div>
        <div className="no-print">
          {filteredIssueDiffs.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600">No issue changes for this filter.</p>
          ) : (
            <>
              {filteredIssueDiffs.length > SNAPSHOT_UI_ISSUES_PAGE_SIZE ? (
                <p className="mt-4 text-xs text-zinc-500">
                  Showing {visibleIssueDiffs.length} of {filteredIssueDiffs.length} issue changes.
                </p>
              ) : null}
              <CompareIssueDiffTable diffs={visibleIssueDiffs} />
              {issueDiffPagination.hasMore ? (
                <button
                  type="button"
                  onClick={() =>
                    setIssueDiffVisibleCount(issueDiffPagination.nextVisibleCount)
                  }
                  className="no-print mt-4 rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900"
                >
                  Show more changes ({issueDiffPagination.total - issueDiffPagination.visible.length} remaining)
                </button>
              ) : null}
            </>
          )}
        </div>
        <div className="print-only print-break-before">
          <p className="mb-3 text-sm text-zinc-600">
            All issue changes ({issueDiffs.length})
          </p>
          <CompareIssueDiffTable diffs={issueDiffs} />
        </div>
      </CollapsibleSection>
    </div>
  )
}

type ReconciliationSnapshotCompareClientProps
 = {
  leftId?: string
  rightId?: string
}

export function ReconciliationSnapshotCompareClient({
  leftId: initialLeftId = "",
  rightId: initialRightId = "",
}: ReconciliationSnapshotCompareClientProps) {
  const [leftId, setLeftId] = useState(initialLeftId)
  const [rightId, setRightId] = useState(initialRightId)
  const [left, setLeft] = useState<ReconciliationSnapshotDetail | null>(null)
  const [right, setRight] = useState<ReconciliationSnapshotDetail | null>(null)
  const [pickerOptions, setPickerOptions] = useState<
    ReconciliationSnapshotHeader[] | null
  >(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLeftId(initialLeftId)
    setRightId(initialRightId)
  }, [initialLeftId, initialRightId])

  useEffect(() => {
    let cancelled = false

    async function loadPickerOptions() {
      try {
        const result = await fetchReconciliationSnapshots({ limit: 100 })
        if (cancelled) return
        if (!cancelled) {
          setPickerOptions(result.snapshots)
        }
      } catch {
        if (!cancelled) {
          setPickerOptions([])
        }
      }
    }

    void loadPickerOptions()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!leftId || !rightId || leftId === rightId) {
      setLeft(null)
      setRight(null)
      return
    }

    let cancelled = false

    async function loadCompare() {
      setLoading(true)
      setError(null)
      try {
        const [leftResult, rightResult] = await Promise.all([
          fetchReconciliationSnapshotById(leftId),
          fetchReconciliationSnapshotById(rightId),
        ])
        if (!cancelled) {
          setLeft(leftResult.snapshot)
          setRight(rightResult.snapshot)
        }
      } catch (err) {
        if (!cancelled) {
          setLeft(null)
          setRight(null)
          setError(err instanceof Error ? err.message : "Request failed")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadCompare()
    return () => {
      cancelled = true
    }
  }, [leftId, rightId])

  function handleCompareNavigate() {
    if (!leftId || !rightId || leftId === rightId) {
      return
    }
    const params = new URLSearchParams({ left: leftId, right: rightId })
    window.history.replaceState(null, "", `?${params.toString()}`)
  }

  if (leftId && rightId && leftId === rightId) {
    return (
      <p className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Choose two different snapshots to compare.
      </p>
    )
  }

  if (!leftId || !rightId) {
    return (
      <SnapshotPicker
        snapshots={pickerOptions}
        leftId={leftId}
        rightId={rightId}
        onLeftChange={setLeftId}
        onRightChange={setRightId}
        onCompare={handleCompareNavigate}
      />
    )
  }

  if (loading) {
    return <CompareSkeleton />
  }

  if (error) {
    return (
      <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </p>
    )
  }

  if (!left || !right) {
    return (
      <SnapshotPicker
        snapshots={pickerOptions}
        leftId={leftId}
        rightId={rightId}
        onLeftChange={setLeftId}
        onRightChange={setRightId}
        onCompare={handleCompareNavigate}
      />
    )
  }

  return <ReconciliationSnapshotCompareView left={left} right={right} />
}