"use client"

import { useMemo, useState } from "react"
import { formatAmount } from "@/lib/finance-ui/format"
import { buildFinanceTrace } from "@/lib/finance-ui/traceability"
import type { ReconciliationIssueRow } from "@/lib/finance-ui/types"
import { FinanceTraceabilityPanel } from "./FinanceTraceabilityPanel"
import { OperationalSourceChip } from "./traceability-badges"
import { ReconciliationStatusBadge } from "./ReconciliationStatusBadge"

type ReconciliationIssuesTableProps = {
  issues: ReconciliationIssueRow[]
  loading?: boolean
  error?: string | null
}

export function ReconciliationIssuesTable({
  issues,
  loading = false,
  error = null,
}: ReconciliationIssuesTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (loading) {
    return (
      <p className="mt-3 text-sm text-zinc-600">Loading transaction issues…</p>
    )
  }

  if (error) {
    return (
      <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
        {error}
      </p>
    )
  }

  if (issues.length === 0) {
    return (
      <p className="mt-3 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
        No transaction-level issues for this scope.
      </p>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      {issues.map((issue) => {
        const expanded = expandedId === issue.id

        return (
          <IssueRow
            key={issue.id}
            issue={issue}
            expanded={expanded}
            onToggle={() => setExpandedId(expanded ? null : issue.id)}
          />
        )
      })}
    </div>
  )
}

function IssueRow({
  issue,
  expanded,
  onToggle,
}: {
  issue: ReconciliationIssueRow
  expanded: boolean
  onToggle: () => void
}) {
  const trace = useMemo(
    () => buildFinanceTrace(issue, { mode: "live" }),
    [issue]
  )

  return (
    <div className="rounded border border-zinc-200 bg-white text-sm">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left hover:bg-zinc-50"
        onClick={onToggle}
      >
        <div>
          <p className="font-medium text-zinc-900">{issue.documentRef}</p>
          <div className="mt-1">
            <OperationalSourceChip row={issue} />
          </div>
          <p className="mt-1 text-zinc-600">
            {issue.issueType.replace(/_/g, " ")}
          </p>
        </div>
        <ReconciliationStatusBadge status={issue.status} />
      </button>
      {expanded ? (
        <div className="border-t border-zinc-100 px-3 py-3 text-zinc-700">
          <p>{issue.message}</p>
          <div className="mt-3">
            <FinanceTraceabilityPanel trace={trace} />
          </div>
          <dl className="mt-3 grid gap-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="text-zinc-500">Source</dt>
              <dd>
                <OperationalSourceChip row={issue} />
              </dd>
            </div>
            {issue.expectedAmount !== null ? (
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Expected</dt>
                <dd className="tabular-nums">
                  {formatAmount(String(issue.expectedAmount))}
                </dd>
              </div>
            ) : null}
            {issue.actualAmount !== null ? (
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Actual</dt>
                <dd className="tabular-nums">
                  {formatAmount(String(issue.actualAmount))}
                </dd>
              </div>
            ) : null}
            {issue.difference !== null ? (
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Difference</dt>
                <dd className="tabular-nums">
                  {formatAmount(String(issue.difference))}
                </dd>
              </div>
            ) : null}
            {issue.sourceCreatedAt ? (
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Created</dt>
                <dd>{issue.sourceCreatedAt}</dd>
              </div>
            ) : null}
            {issue.sourcePostedAt ? (
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Posted</dt>
                <dd>{issue.sourcePostedAt}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}
    </div>
  )
}
