"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import {
  buildCloseEvidenceTraceLinks,
  formatMoneyDisplay,
  type CloseEvidenceDetail,
} from "@/lib/finance-ui/close-evidence"
import { formatCloseReadinessStatusLabel } from "@/lib/finance-ui/close-readiness"
import { fetchCloseEvidence } from "@/lib/finance-ui/period-fetchers"
import { CloseReadinessStatusBadge } from "./CloseReadinessStatusBadge"

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

type SummaryRowProps = {
  label: string
  value: string
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-zinc-100 py-2 text-sm last:border-b-0">
      <span className="text-zinc-600">{label}</span>
      <span className="font-medium text-zinc-900">{value}</span>
    </div>
  )
}

type CloseEvidenceViewProps = {
  evidence: CloseEvidenceDetail
}

export function CloseEvidenceView({ evidence }: CloseEvidenceViewProps) {
  const { payload } = evidence
  const traceLinks = buildCloseEvidenceTraceLinks(evidence)
  const metrics = payload.reconciliationSummary
  const issueSummary = payload.traceabilityRefs.issueSummary

  return (
    <div className="space-y-6">
      <section className="rounded border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Accounting period</p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-900">{evidence.periodKey}</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Branch {evidence.branchId} · {evidence.closeMode} close
            </p>
          </div>
          <CloseReadinessStatusBadge status={evidence.readinessStatus} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <SummaryRow label="HARD closed at" value={formatDateTime(evidence.closedAt)} />
          <SummaryRow
            label="Closed by"
            value={`${evidence.closedByName} (${evidence.closedByRole})`}
          />
          <SummaryRow
            label="Readiness at close"
            value={formatCloseReadinessStatusLabel(evidence.readinessStatus)}
          />
          <SummaryRow label="Status before close" value={payload.period.statusBefore} />
        </div>
        <p className="mt-3 text-sm text-zinc-700">
          Immutable close evidence captured at HARD close. Values are frozen and are not rebuilt
          from live reconciliation.
        </p>
        <div className="mt-4">
          <Link
            href="/finance/periods"
            className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-white"
          >
            Back to periods
          </Link>
        </div>
      </section>

      <section className="rounded border border-zinc-200 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Gate summary (at close)</h3>
        <div className="mt-3">
          <SummaryRow label="Policy" value={payload.gate.policyKey} />
          <SummaryRow
            label="Reject BLOCKED"
            value={payload.gate.rejectBlocked ? "Yes" : "No"}
          />
          <SummaryRow
            label="Reject WARNING"
            value={payload.gate.rejectWarnings ? "Yes" : "No"}
          />
          <SummaryRow label="Blockers" value={String(payload.checklist.blockerCount)} />
          <SummaryRow label="Warnings" value={String(payload.checklist.warningCount)} />
          <SummaryRow label="Checklist items" value={String(payload.checklist.items.length)} />
        </div>
        {payload.checklist.items.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm">
            {payload.checklist.items.map((item) => (
              <li
                key={item.id}
                className="rounded border border-zinc-100 bg-zinc-50 px-3 py-2"
              >
                <span className="font-medium text-zinc-900">{item.title}</span>
                <span className="ml-2 text-xs text-zinc-500">
                  {item.group} · {item.severity}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded border border-zinc-200 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Reconciliation summary (frozen)</h3>
        <div className="mt-3">
          <SummaryRow label="Dashboard rows" value={String(metrics.dashboardRowCount)} />
          <SummaryRow label="Matched rows" value={String(metrics.matchedCount)} />
          <SummaryRow label="Variance rows" value={String(metrics.varianceCount)} />
          <SummaryRow
            label="Total variance amount"
            value={formatMoneyDisplay(metrics.totalVarianceAmount)}
          />
          <SummaryRow label="Issues (snapshot)" value={String(metrics.issueCount)} />
          <SummaryRow label="Missing GL issues" value={String(metrics.missingGlIssueCount)} />
          <SummaryRow
            label="Missing source issues"
            value={String(metrics.missingSourceIssueCount)}
          />
          <SummaryRow
            label="Compare drift detected"
            value={metrics.compareDriftDetected ? "Yes" : "No"}
          />
        </div>
        <div className="mt-4 border-t border-zinc-100 pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Issue counts (trace)
          </p>
          <div className="mt-2">
            <SummaryRow label="Total issues" value={String(issueSummary.totalCount)} />
            <SummaryRow label="Missing GL" value={String(issueSummary.missingGlCount)} />
            <SummaryRow label="Missing source" value={String(issueSummary.missingSourceCount)} />
            <SummaryRow label="Variance status" value={String(issueSummary.varianceStatusCount)} />
            <SummaryRow label="Error severity" value={String(issueSummary.errorSeverityCount)} />
          </div>
        </div>
      </section>

      <section className="rounded border border-zinc-200 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Financial totals (frozen)</h3>
        <div className="mt-3">
          <SummaryRow
            label="Operational inventory"
            value={formatMoneyDisplay(payload.financialTotals.operationalInventoryValue)}
          />
          <SummaryRow
            label="GL inventory"
            value={formatMoneyDisplay(payload.financialTotals.glInventoryBalance)}
          />
          <SummaryRow
            label="Operational revenue"
            value={formatMoneyDisplay(payload.financialTotals.operationalRevenue)}
          />
          <SummaryRow
            label="GL revenue"
            value={formatMoneyDisplay(payload.financialTotals.glRevenueBalance)}
          />
        </div>
      </section>

      <section className="rounded border border-zinc-200 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Traceability</h3>
        <div className="mt-3">
          <SummaryRow
            label="Reconciliation snapshot"
            value={evidence.reconciliationSnapshotId ?? "—"}
          />
          <SummaryRow label="Prior snapshot" value={evidence.priorSnapshotId ?? "—"} />
        </div>
        {traceLinks.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {traceLinks.map((link) => (
              <li key={`${link.label}:${link.href}`}>
                <Link
                  href={link.href}
                  className="inline-block rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-600">No snapshot references were captured.</p>
        )}
      </section>
    </div>
  )
}

type CloseEvidencePageProps = {
  periodId: string
}

export function CloseEvidencePage({ periodId }: CloseEvidencePageProps) {
  const [evidence, setEvidence] = useState<CloseEvidenceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEvidence = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await fetchCloseEvidence(periodId)
      setEvidence(result.evidence)
    } catch (err) {
      setEvidence(null)
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }, [periodId])

  useEffect(() => {
    void loadEvidence()
  }, [loadEvidence])

  if (loading && !evidence) {
    return <p className="text-zinc-600">Loading close evidence…</p>
  }

  if (error && !evidence) {
    return (
      <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </p>
    )
  }

  if (!evidence) {
    return null
  }

  return <CloseEvidenceView evidence={evidence} />
}
