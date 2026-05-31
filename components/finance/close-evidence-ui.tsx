"use client"

import { useState } from "react"
import { buildCloseEvidenceExport } from "@/lib/finance-ui/close-evidence-export"
import type { CloseEvidenceDetail } from "@/lib/finance-ui/close-evidence"
import { formatExportTimestamp } from "@/lib/finance-ui/export-formatters"
import { downloadEvidenceCsvFiles } from "@/lib/finance-ui/reconciliation-export"
import { PrintAuditButton } from "./reconciliation-snapshot-ui"

export const CLOSE_EVIDENCE_FROZEN_DISCLAIMER =
  "Frozen close evidence - captured at HARD close only (no live reconciliation or checklist rebuild)."

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

export function CloseEvidenceAuditPrintHeader({
  evidence,
}: {
  evidence: CloseEvidenceDetail
}) {
  const printedAt = formatExportTimestamp()

  return (
    <div className="print-only print-break-inside-avoid mb-4 border-b border-zinc-300 pb-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Accounting period close evidence audit
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-zinc-900">
          {evidence.periodKey} / Branch {evidence.branchId}
        </h2>
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Evidence ID</dt>
          <dd className="font-mono text-xs text-zinc-900">{evidence.id}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">HARD closed at</dt>
          <dd className="text-zinc-900">{formatDateTime(evidence.closedAt)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Closed by</dt>
          <dd className="text-zinc-900">
            {evidence.closedByName} ({evidence.closedByRole})
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Readiness at close</dt>
          <dd className="text-zinc-900">{evidence.readinessStatus}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Printed</dt>
          <dd className="text-zinc-900">{printedAt}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-zinc-700">{CLOSE_EVIDENCE_FROZEN_DISCLAIMER}</p>
    </div>
  )
}

export async function runCloseEvidenceExportDownload(
  evidence: CloseEvidenceDetail
): Promise<void> {
  await downloadEvidenceCsvFiles(buildCloseEvidenceExport(evidence))
}

export function CloseEvidenceActionBar({
  evidence,
}: {
  evidence: CloseEvidenceDetail
}) {
  const [exporting, setExporting] = useState(false)

  async function handleExportPack() {
    setExporting(true)
    try {
      await runCloseEvidenceExportDownload(evidence)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="no-print rounded border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-900">Close evidence export</p>
          <p className="mt-1 text-xs text-zinc-600">
            Stored HARD-close evidence only - metadata, checklist, reconciliation summary,
            financial totals, and traceability CSVs.
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
            {exporting ? "Exporting..." : "Export evidence pack"}
          </button>
        </div>
      </div>
    </div>
  )
}