"use client"

import { formatDateTime } from "@/lib/finance-ui/format"
import { formatExportTimestamp } from "@/lib/finance-ui/export-formatters"
import {
  formatAmountDelta,
  formatCountDelta,
  formatSnapshotDisplayTitle,
  formatSnapshotKindLabel,
  formatSnapshotScope,
  type DashboardRowDiffKind,
  type IssueDiffKind,
} from "@/lib/finance-ui/reconciliation-snapshots"
import type {
  ReconciliationSnapshotDetail,
  ReconciliationSnapshotHeader,
} from "@/lib/finance-ui/types"

export const FROZEN_TRACE_DISCLAIMER =
  "Frozen trace - refs from capture time only (no live voucher fetch)."

export const FROZEN_SNAPSHOT_DISCLAIMER =
  "Frozen snapshot โ€” data from capture time only (no live reconciliation fetch)."

export function PrintAuditButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900"
    >
      Print audit report
    </button>
  )
}

export function SnapshotAuditPrintHeader({
  snapshot,
}: {
  snapshot: ReconciliationSnapshotDetail
}) {
  const printedAt = formatExportTimestamp()

  return (
    <div className="print-only print-break-inside-avoid mb-4 border-b border-zinc-300 pb-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Reconciliation snapshot audit
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-zinc-900">
          {formatSnapshotDisplayTitle(snapshot)}
        </h2>
        <SnapshotKindBadge kind={snapshot.kind} />
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Scope</dt>
          <dd className="text-zinc-900">{formatSnapshotScope(snapshot)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Captured</dt>
          <dd className="text-zinc-900">{formatDateTime(snapshot.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Snapshot ID</dt>
          <dd className="font-mono text-xs text-zinc-900">{snapshot.id}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Printed</dt>
          <dd className="text-zinc-900">{printedAt}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-zinc-700">{FROZEN_SNAPSHOT_DISCLAIMER}</p>
    </div>
  )
}

export function CompareAuditPrintHeader({
  left,
  right,
}: {
  left: ReconciliationSnapshotDetail
  right: ReconciliationSnapshotDetail
}) {
  const printedAt = formatExportTimestamp()

  return (
    <div className="print-only print-break-inside-avoid mb-4 border-b border-zinc-300 pb-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Snapshot compare audit
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-zinc-500">Left snapshot</p>
          <p className="mt-1 font-medium text-zinc-900">
            {formatSnapshotDisplayTitle(left)}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {formatSnapshotScope(left)} ยท {formatDateTime(left.createdAt)}
          </p>
          <p className="mt-1 font-mono text-xs text-zinc-500">{left.id}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500">Right snapshot</p>
          <p className="mt-1 font-medium text-zinc-900">
            {formatSnapshotDisplayTitle(right)}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {formatSnapshotScope(right)} ยท {formatDateTime(right.createdAt)}
          </p>
          <p className="mt-1 font-mono text-xs text-zinc-500">{right.id}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-zinc-700">
        Client-side diff of frozen payloads only โ€” no live reconciliation fetch.
      </p>
      <p className="mt-1 text-xs text-zinc-500">Printed {printedAt}</p>
    </div>
  )
}

export type CollapsibleSectionProps = {
  title: string
  open?: boolean
  children: React.ReactNode
}

export function CollapsibleSection({
  title,
  open = true,
  children,
}: CollapsibleSectionProps) {
  return (
    <details
      open={open}
      className="rounded border border-zinc-200 bg-white"
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-base font-semibold text-zinc-900 [&::-webkit-details-marker]:hidden">
        {title}
      </summary>
      <div className="border-t border-zinc-100 px-4 pb-4 pt-3">{children}</div>
    </details>
  )
}

export function SnapshotKindBadge({
  kind,
}: {
  kind: ReconciliationSnapshotHeader["kind"]
}) {
  return (
    <span className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-700">
      {formatSnapshotKindLabel(kind)}
    </span>
  )
}

export function SnapshotDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-48 animate-pulse rounded bg-zinc-200" />
      <div className="h-4 w-72 animate-pulse rounded bg-zinc-200" />
      <div className="h-16 animate-pulse rounded border border-zinc-200 bg-zinc-100" />
      <div className="h-40 animate-pulse rounded border border-zinc-200 bg-zinc-100" />
    </div>
  )
}

export function CompareSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-28 animate-pulse rounded border border-zinc-200 bg-zinc-100" />
        <div className="h-28 animate-pulse rounded border border-zinc-200 bg-zinc-100" />
      </div>
      <div className="h-24 animate-pulse rounded border border-zinc-200 bg-zinc-100" />
    </div>
  )
}

export function DiffKindBadge({
  kind,
}: {
  kind: DashboardRowDiffKind | IssueDiffKind
}) {
  const styles: Record<string, string> = {
    added: "bg-green-100 text-green-800",
    removed: "bg-red-100 text-red-800",
    changed: "bg-amber-100 text-amber-900",
    unchanged: "bg-zinc-100 text-zinc-700",
  }
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${styles[kind] ?? styles.unchanged}`}
    >
      {kind}
    </span>
  )
}

export function DeltaChip({
  delta,
  amount = false,
}: {
  delta: number
  amount?: boolean
}) {
  const label = amount ? formatAmountDelta(delta) : formatCountDelta(delta)
  const tone =
    delta > 0
      ? "bg-amber-100 text-amber-900"
      : delta < 0
        ? "bg-green-100 text-green-800"
        : "bg-zinc-100 text-zinc-700"
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium tabular-nums ${tone}`}
    >
      {label}
    </span>
  )
}
