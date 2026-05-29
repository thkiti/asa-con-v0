import Link from "next/link"
import type { CloseGateBlocker } from "@/lib/finance/close-gate-errors"
import { buildCloseReadinessPath } from "@/lib/finance-ui/close-readiness"
import { buildSnapshotDetailPath } from "@/lib/finance-ui/trace-links"

type CloseGateBlockerListProps = {
  blockers: CloseGateBlocker[]
  periodId?: string
  compact?: boolean
}

const severityToneClasses: Record<CloseGateBlocker["severity"], string> = {
  BLOCKED: "border-red-200 bg-red-50",
  WARNING: "border-amber-200 bg-amber-50",
  INFO: "border-zinc-200 bg-zinc-50",
  PASS: "border-green-200 bg-green-50",
}

function BlockerRefs({ blocker }: { blocker: CloseGateBlocker }) {
  const refs = blocker.refs
  if (!refs) {
    return null
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
      {refs.snapshotId ? (
        <Link
          href={buildSnapshotDetailPath(refs.snapshotId)}
          className="rounded border border-zinc-300 px-2 py-1 hover:bg-white"
        >
          Snapshot {refs.snapshotId}
        </Link>
      ) : null}
      {refs.periodKey ? <span>Period {refs.periodKey}</span> : null}
      {refs.branchId ? <span>Branch {refs.branchId}</span> : null}
    </div>
  )
}

export function CloseGateBlockerList({
  blockers,
  periodId,
  compact = false,
}: CloseGateBlockerListProps) {
  if (blockers.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-zinc-900">
        {compact ? "Close blockers" : "Resolve these blockers before hard close"}
      </p>
      <ul className="space-y-2">
        {blockers.map((blocker) => (
          <li
            key={blocker.id}
            className={"rounded border p-3 " + severityToneClasses[blocker.severity]}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-zinc-900">{blocker.title}</p>
                <p className="mt-1 text-sm text-zinc-700">{blocker.detail}</p>
              </div>
              <span className="text-xs font-medium uppercase text-zinc-600">
                {blocker.severity}
              </span>
            </div>
            <BlockerRefs blocker={blocker} />
          </li>
        ))}
      </ul>
      {periodId ? (
        <Link
          href={buildCloseReadinessPath(periodId)}
          className="inline-block text-sm font-medium text-zinc-900 underline"
        >
          Open full close readiness review
        </Link>
      ) : null}
    </div>
  )
}
