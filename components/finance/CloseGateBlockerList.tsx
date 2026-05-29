import Link from "next/link"
import type { CloseGateBlocker } from "@/lib/finance/close-gate-errors"
import {
  buildCloseReadinessPath,
  formatCloseChecklistGroupLabel,
} from "@/lib/finance-ui/close-readiness"
import {
  resolveCloseGateBlockerLinks,
  type CloseGateBlockerSurfaceContext,
} from "@/lib/finance-ui/close-readiness-links"

type CloseGateBlockerListProps = {
  blockers: CloseGateBlocker[]
  periodId?: string
  context?: CloseGateBlockerSurfaceContext
  compact?: boolean
  title?: string
  errorCode?: string
  readinessStatus?: string
}

const severityToneClasses: Record<CloseGateBlocker["severity"], string> = {
  BLOCKED: "border-red-200 bg-red-50",
  WARNING: "border-amber-200 bg-amber-50",
  INFO: "border-zinc-200 bg-zinc-50",
  PASS: "border-green-200 bg-green-50",
}

const severityBadgeClasses: Record<CloseGateBlocker["severity"], string> = {
  BLOCKED: "bg-red-100 text-red-800",
  WARNING: "bg-amber-100 text-amber-800",
  INFO: "bg-zinc-100 text-zinc-700",
  PASS: "bg-green-100 text-green-800",
}

function mergeContext(
  periodId: string | undefined,
  context: CloseGateBlockerSurfaceContext | undefined
): CloseGateBlockerSurfaceContext {
  return {
    ...context,
    periodId: context?.periodId ?? periodId,
  }
}

function BlockerRefText({ blocker }: { blocker: CloseGateBlocker }) {
  const refs = blocker.refs
  if (!refs) {
    return null
  }

  const parts: string[] = []
  if (refs.branchId) parts.push(`Branch ${refs.branchId}`)
  if (refs.periodKey) parts.push(`Period ${refs.periodKey}`)
  if (refs.snapshotId) parts.push(`Snapshot ${refs.snapshotId}`)
  if (refs.compareSnapshotId) parts.push(`Compare ${refs.compareSnapshotId}`)

  if (parts.length === 0) {
    return null
  }

  return <p className="mt-2 text-xs text-zinc-600">{parts.join(" · ")}</p>
}

function BlockerActionLinks({
  blocker,
  context,
}: {
  blocker: CloseGateBlocker
  context: CloseGateBlockerSurfaceContext
}) {
  const links = resolveCloseGateBlockerLinks(blocker, context)

  if (links.length === 0) {
    return null
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {links.map((link) => (
        <Link
          key={`${blocker.id}:${link.label}:${link.href}`}
          href={link.href}
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
        >
          {link.label}
        </Link>
      ))}
    </div>
  )
}

function BlockerCard({
  blocker,
  context,
}: {
  blocker: CloseGateBlocker
  context: CloseGateBlockerSurfaceContext
}) {
  return (
    <li
      className={"rounded border p-4 " + severityToneClasses[blocker.severity]}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
            <span className="font-medium uppercase tracking-wide">
              {formatCloseChecklistGroupLabel(blocker.group)}
            </span>
            <span className="font-mono">{blocker.id}</span>
          </div>
          <p className="text-sm font-medium text-zinc-900">{blocker.title}</p>
        </div>
        <span
          className={
            "inline-block rounded px-2 py-0.5 text-xs font-medium " +
            severityBadgeClasses[blocker.severity]
          }
        >
          {blocker.severity}
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-700">{blocker.detail}</p>
      <BlockerRefText blocker={blocker} />
      <BlockerActionLinks blocker={blocker} context={context} />
    </li>
  )
}

export function CloseGateBlockerList({
  blockers,
  periodId,
  context,
  compact = false,
  title,
  errorCode,
  readinessStatus,
}: CloseGateBlockerListProps) {
  if (blockers.length === 0) {
    return null
  }

  const surfaceContext = mergeContext(periodId, context)
  const heading =
    title ??
    (compact ? "Close blockers" : "Resolve these blockers before hard close")

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-zinc-900">{heading}</p>
        {errorCode || readinessStatus ? (
          <p className="mt-1 text-xs text-zinc-600">
            {errorCode ? <span className="font-mono">Code: {errorCode}</span> : null}
            {errorCode && readinessStatus ? <span> · </span> : null}
            {readinessStatus ? (
              <span>Readiness: {readinessStatus}</span>
            ) : null}
          </p>
        ) : null}
      </div>
      <ul className="space-y-3">
        {blockers.map((blocker) => (
          <BlockerCard
            key={blocker.id}
            blocker={blocker}
            context={surfaceContext}
          />
        ))}
      </ul>
      {surfaceContext.periodId ? (
        <Link
          href={buildCloseReadinessPath(surfaceContext.periodId)}
          className="inline-block text-sm font-medium text-zinc-900 underline"
        >
          Open full close readiness review
        </Link>
      ) : null}
    </div>
  )
}
