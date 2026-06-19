"use client"

import { memo } from "react"
import Link from "next/link"
import { formatDateTime } from "@/lib/finance-ui/format"
import {
  buildSnapshotDetailPath,
  buildVoucherDetailPath,
} from "@/lib/finance-ui/trace-links"
import { useFinanceCurrentReturnPath } from "@/lib/finance-ui/use-finance-current-return-path"
import {
  formatFinanceRefType,
  formatTraceLabel,
  type FinanceTrace,
  type TraceStep,
} from "@/lib/finance-ui/traceability"
import { FROZEN_TRACE_DISCLAIMER } from "./reconciliation-snapshot-ui"
import { CopyRefButton } from "./traceability-badges"
import { TraceStepKindBadge } from "./traceability-ui"

type FinanceTraceabilityPanelProps = {
  trace: FinanceTrace
  readOnly?: boolean
  frozen?: boolean
}

function TraceStepMeta({ label, value }: { label: string; value: string }) {
  return (
    <p className="mt-1 text-xs text-zinc-600">
      <span className="text-zinc-500">{label}: </span>
      <span className="font-mono">{value}</span>
    </p>
  )
}

function TraceStepBody({ step }: { step: TraceStep }) {
  const returnTo = useFinanceCurrentReturnPath()
  const label = formatTraceLabel(step)

  switch (step.kind) {
    case "operational":
      return (
        <div>
          <p className="font-medium text-zinc-900">{label}</p>
          {step.refId ? (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <TraceStepMeta label="Source ID" value={step.refId} />
              <CopyRefButton value={step.refId} />
            </div>
          ) : null}
        </div>
      )
    case "voucher":
      return (
        <div>
          <Link
            href={buildVoucherDetailPath(step.id, returnTo)}
            className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-600"
          >
            {label}
          </Link>
          {step.refType && step.refId ? (
            <TraceStepMeta
              label="Ref"
              value={`${formatFinanceRefType(step.refType)} · ${step.refId}`}
            />
          ) : null}
        </div>
      )
    case "journal":
      return (
        <div>
          {step.voucherId ? (
            <Link
              href={buildVoucherDetailPath(step.voucherId, returnTo)}
              className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-600"
            >
              {label}
            </Link>
          ) : (
            <p className="font-medium text-zinc-900">{label}</p>
          )}
          <TraceStepMeta label="Journal ID" value={step.id} />
        </div>
      )
    case "issue":
      return (
        <div>
          <p className="font-medium text-zinc-900">{label}</p>
          <TraceStepMeta label="Issue ID" value={step.id} />
        </div>
      )
    case "evidence":
      return (
        <div>
          {step.refType === "SNAPSHOT" && step.refId ? (
            <Link
              href={buildSnapshotDetailPath(step.refId)}
              className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-600"
            >
              {label}
            </Link>
          ) : (
            <p className="font-medium text-zinc-900">{label}</p>
          )}
          {step.refId && step.refType !== "LIVE_RECONCILIATION" ? (
            <TraceStepMeta label="Evidence ID" value={step.refId} />
          ) : null}
        </div>
      )
    default:
      return <p className="font-medium text-zinc-900">{label}</p>
  }
}

export const FinanceTraceabilityPanel = memo(function FinanceTraceabilityPanel({
  trace,
  readOnly = true,
  frozen = false,
}: FinanceTraceabilityPanelProps) {
  return (
    <div className="rounded border border-zinc-200 bg-zinc-50/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-zinc-900">Finance lineage</p>
        <p className="font-mono text-xs text-zinc-500">{trace.documentRef}</p>
      </div>

      {frozen ? (
        <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
          {FROZEN_TRACE_DISCLAIMER}
        </p>
      ) : null}

      <ol className="mt-3 space-y-0">
        {trace.steps.map((step, index) => (
          <li key={step.sortKey} className="relative pl-6">
            {index < trace.steps.length - 1 ? (
              <span
                aria-hidden
                className="absolute left-[7px] top-5 h-[calc(100%+0.25rem)] w-px bg-zinc-300"
              />
            ) : null}
            <span
              aria-hidden
              className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-zinc-300 bg-white"
            />
            <div className="rounded border border-zinc-200 bg-white px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <TraceStepKindBadge kind={step.kind} />
                {step.postedAt ? (
                  <time
                    dateTime={step.postedAt}
                    className="text-xs text-zinc-500"
                  >
                    {formatDateTime(step.postedAt)}
                  </time>
                ) : null}
              </div>
              <div className="mt-2">
                <TraceStepBody step={step} />
              </div>
            </div>
          </li>
        ))}
      </ol>

      {readOnly ? (
        <p className="mt-3 text-xs text-zinc-500">
          Read-only trace — navigation and copy only.
        </p>
      ) : null}
    </div>
  )
})
