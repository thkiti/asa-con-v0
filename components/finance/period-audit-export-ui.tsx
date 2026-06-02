"use client"

import { useState } from "react"
import type { PeriodAuditExportBundle } from "@/lib/finance/period-audit-export-types"
import { buildPeriodAuditExport } from "@/lib/finance-ui/period-audit-export"
import { formatExportTimestamp } from "@/lib/finance-ui/export-formatters"
import { downloadEvidenceCsvFiles } from "@/lib/finance-ui/reconciliation-export"
import { PrintAuditButton } from "./reconciliation-snapshot-ui"

export const PERIOD_AUDIT_FROZEN_DISCLAIMER =
  "Period audit export — derived from stored period, timeline, and immutable evidence/request records. No live reconciliation, checklist rebuild, or close/reopen execution."

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

export function PeriodAuditReportPrintHeader({
  bundle,
}: {
  bundle: PeriodAuditExportBundle
}) {
  const printedAt = formatExportTimestamp()

  return (
    <div className="print-only print-break-inside-avoid mb-4 border-b border-zinc-300 pb-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Accounting period audit report
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-zinc-900">
          {bundle.period.periodKey} / Branch {bundle.period.branchId}
        </h2>
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Period status</dt>
          <dd className="text-zinc-900">{bundle.period.status}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Opened</dt>
          <dd className="text-zinc-900">{formatDateTime(bundle.period.openedAt)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Closed</dt>
          <dd className="text-zinc-900">
            {bundle.period.closedAt ? formatDateTime(bundle.period.closedAt) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Bundle exported at</dt>
          <dd className="text-zinc-900">{formatDateTime(bundle.exportedAt)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Printed</dt>
          <dd className="text-zinc-900">{printedAt}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Timeline events</dt>
          <dd className="text-zinc-900">{bundle.counts.timelineEventCount}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-zinc-700">{PERIOD_AUDIT_FROZEN_DISCLAIMER}</p>
    </div>
  )
}

export function PeriodAuditReportPrintBody({
  bundle,
}: {
  bundle: PeriodAuditExportBundle
}) {
  return (
    <div className="print-only space-y-6 text-sm">
      <section className="print-break-inside-avoid">
        <h3 className="font-semibold text-zinc-900">Timeline</h3>
        {bundle.timeline.length === 0 ? (
          <p className="mt-2 text-zinc-600">No timeline events recorded.</p>
        ) : (
          <table className="mt-2 w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-300">
                <th className="py-1 pr-2">When</th>
                <th className="py-1 pr-2">Type</th>
                <th className="py-1 pr-2">Title</th>
                <th className="py-1">Actor</th>
              </tr>
            </thead>
            <tbody>
              {bundle.timeline.map((item) => (
                <tr key={item.id} className="border-b border-zinc-100">
                  <td className="py-1 pr-2 align-top">{formatDateTime(item.occurredAt)}</td>
                  <td className="py-1 pr-2 align-top">{item.type}</td>
                  <td className="py-1 pr-2 align-top">{item.title}</td>
                  <td className="py-1 align-top">{item.actorName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="print-break-inside-avoid">
        <h3 className="font-semibold text-zinc-900">Close evidence index</h3>
        {bundle.closeEvidence.length === 0 ? (
          <p className="mt-2 text-zinc-600">No close evidence records.</p>
        ) : (
          <table className="mt-2 w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-300">
                <th className="py-1 pr-2">Closed at</th>
                <th className="py-1 pr-2">By</th>
                <th className="py-1">Readiness</th>
              </tr>
            </thead>
            <tbody>
              {bundle.closeEvidence.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100">
                  <td className="py-1 pr-2">{formatDateTime(row.closedAt)}</td>
                  <td className="py-1 pr-2">
                    {row.closedByName} ({row.closedByRole})
                  </td>
                  <td className="py-1">{row.readinessStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="print-break-inside-avoid">
        <h3 className="font-semibold text-zinc-900">Reopen evidence</h3>
        {bundle.reopenEvidence.length === 0 ? (
          <p className="mt-2 text-zinc-600">No reopen evidence records.</p>
        ) : (
          <table className="mt-2 w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-300">
                <th className="py-1 pr-2">When</th>
                <th className="py-1 pr-2">Transition</th>
                <th className="py-1">By</th>
              </tr>
            </thead>
            <tbody>
              {bundle.reopenEvidence.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100">
                  <td className="py-1 pr-2">{formatDateTime(row.reopenedAt)}</td>
                  <td className="py-1 pr-2">
                    {row.fromStatus} - {row.toStatus}
                  </td>
                  <td className="py-1">
                    {row.reopenedByName} ({row.reopenedByRole})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="print-break-inside-avoid">
        <h3 className="font-semibold text-zinc-900">Reopen requests</h3>
        {bundle.reopenRequests.length === 0 ? (
          <p className="mt-2 text-zinc-600">No reopen requests.</p>
        ) : (
          <table className="mt-2 w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-300">
                <th className="py-1 pr-2">Request</th>
                <th className="py-1 pr-2">Status</th>
                <th className="py-1">Requested</th>
              </tr>
            </thead>
            <tbody>
              {bundle.reopenRequests.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100">
                  <td className="py-1 pr-2">{row.requestNo}</td>
                  <td className="py-1 pr-2">{row.status}</td>
                  <td className="py-1">
                    {row.requestedByName} · {formatDateTime(row.requestedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

export async function runPeriodAuditExportDownload(
  bundle: PeriodAuditExportBundle
): Promise<void> {
  await downloadEvidenceCsvFiles(buildPeriodAuditExport(bundle))
}

export function PeriodAuditExportActionBar({
  bundle,
}: {
  bundle: PeriodAuditExportBundle
}) {
  const [exporting, setExporting] = useState(false)

  async function handleExportPack() {
    setExporting(true)
    try {
      await runPeriodAuditExportDownload(bundle)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="no-print rounded border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-900">Period audit export</p>
          <p className="mt-1 text-xs text-zinc-600">
            Timeline CSV plus close evidence index, reopen evidence, and reopen request
            summaries from stored records.
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
            {exporting ? "Exporting..." : "Download audit CSV pack"}
          </button>
        </div>
      </div>
    </div>
  )
}
