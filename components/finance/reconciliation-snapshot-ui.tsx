"use client"

import {
  formatAmountDelta,
  formatCountDelta,
  formatSnapshotKindLabel,
  type DashboardRowDiffKind,
  type IssueDiffKind,
} from "@/lib/finance-ui/reconciliation-snapshots"
import type { ReconciliationSnapshotHeader } from "@/lib/finance-ui/types"

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
