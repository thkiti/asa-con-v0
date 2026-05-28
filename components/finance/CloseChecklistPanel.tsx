import Link from "next/link"
import type { CloseChecklistItem } from "@/lib/finance/close-checklist-types"
import {
  formatCloseChecklistGroupLabel,
  groupCloseChecklistItems,
  type CloseReadinessResult,
} from "@/lib/finance-ui/close-readiness"
import {
  buildSnapshotComparePath,
  buildSnapshotEvidenceExportPath,
  buildSnapshotTracePath,
  resolveChecklistItemLinks,
} from "@/lib/finance-ui/close-readiness-links"
import { buildSnapshotDetailPath } from "@/lib/finance-ui/trace-links"

const itemToneClasses: Record<
  CloseChecklistItem["severity"],
  string
> = {
  BLOCKED: "border-red-200 bg-red-50",
  WARNING: "border-amber-200 bg-amber-50",
  INFO: "border-zinc-200 bg-zinc-50",
  PASS: "border-green-200 bg-green-50",
}

const itemBadgeClasses: Record<CloseChecklistItem["severity"], string> = {
  BLOCKED: "bg-red-100 text-red-800",
  WARNING: "bg-amber-100 text-amber-800",
  INFO: "bg-zinc-100 text-zinc-700",
  PASS: "bg-green-100 text-green-800",
}

type CloseChecklistPanelProps = {
  readiness: CloseReadinessResult
}

function ChecklistItemLinks({
  item,
  readiness,
}: {
  item: CloseChecklistItem
  readiness: CloseReadinessResult
}) {
  const links = resolveChecklistItemLinks(item, readiness)

  if (links.length === 0) {
    return null
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2 text-xs">
      {links.map((link) => (
        <Link
          key={`${item.id}:${link.label}:${link.href}`}
          href={link.href}
          className="rounded border border-zinc-300 px-2 py-1 text-zinc-700 hover:bg-white"
        >
          {link.label}
        </Link>
      ))}
    </div>
  )
}

export function CloseChecklistPanel({ readiness }: CloseChecklistPanelProps) {
  const groups = groupCloseChecklistItems(readiness.items)
  const latestSnapshotId = readiness.latestSnapshotRef?.id
  const priorSnapshotId = readiness.priorSnapshotRef?.id

  return (
    <div className="space-y-6">
      <section className="rounded border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-medium text-zinc-900">Blocker summary</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-zinc-500">Overall status</dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900">
              {readiness.status}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Blockers</dt>
            <dd className="mt-1 text-sm font-medium text-red-800">
              {readiness.blockerCount}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Warnings</dt>
            <dd className="mt-1 text-sm font-medium text-amber-800">
              {readiness.warningCount}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Frozen issues</dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900">
              {readiness.metrics.issueCount}
            </dd>
          </div>
        </dl>
        {readiness.latestSnapshotRef ? (
          <div className="mt-3 space-y-2 text-xs text-zinc-600">
            <p>
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
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildSnapshotTracePath(readiness.latestSnapshotRef.id)}
                className="rounded border border-zinc-300 px-2 py-1 text-zinc-700 hover:bg-zinc-50"
              >
                Open trace panel
              </Link>
              <Link
                href={buildSnapshotEvidenceExportPath(
                  readiness.latestSnapshotRef.id
                )}
                className="rounded border border-zinc-300 px-2 py-1 text-zinc-700 hover:bg-zinc-50"
              >
                Open evidence export
              </Link>
              {priorSnapshotId && latestSnapshotId ? (
                <Link
                  href={buildSnapshotComparePath(
                    priorSnapshotId,
                    latestSnapshotId
                  )}
                  className="rounded border border-zinc-300 px-2 py-1 text-zinc-700 hover:bg-zinc-50"
                >
                  Compare captures
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-zinc-600">
            No frozen reconciliation snapshot linked to this period yet.
          </p>
        )}
      </section>

      {groups.map(({ group, items }) => (
        <section key={group} className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-900">
            {formatCloseChecklistGroupLabel(group)}
          </h2>
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className={`rounded border p-4 ${itemToneClasses[item.severity]}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{item.title}</p>
                    <p className="mt-1 text-sm text-zinc-700">{item.detail}</p>
                  </div>
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${itemBadgeClasses[item.severity]}`}
                  >
                    {item.severity}
                  </span>
                </div>
                <ChecklistItemLinks item={item} readiness={readiness} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}