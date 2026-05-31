import type { CloseEvidenceDetail } from "@/lib/finance/close-evidence-types"
import type { CloseReadinessNavLink } from "./close-readiness-links"
import {
  buildSnapshotComparePath,
  buildSnapshotEvidenceExportPath,
  buildSnapshotTracePath,
} from "./close-readiness-links"
import { buildSnapshotDetailPath } from "./trace-links"

export type { CloseEvidenceDetail } from "@/lib/finance/close-evidence-types"

export type CloseEvidenceApiResult = {
  evidence: CloseEvidenceDetail
}

export function buildCloseEvidencePath(periodId: string): string {
  return `/finance/periods/${encodeURIComponent(periodId.trim())}/close-evidence`
}

export function buildCloseEvidenceTraceLinks(
  evidence: CloseEvidenceDetail
): CloseReadinessNavLink[] {
  const links: CloseReadinessNavLink[] = []
  const { traceabilityRefs } = evidence.payload
  const { periodKey, branchId } = evidence
  const latestId =
    traceabilityRefs.reconciliationSnapshotId ??
    traceabilityRefs.latestSnapshotRef?.id ??
    null
  const priorId =
    traceabilityRefs.priorSnapshotId ?? traceabilityRefs.priorSnapshotRef?.id ?? null

  if (latestId) {
    links.push({
      label: "Latest snapshot (frozen)",
      href: buildSnapshotDetailPath(latestId),
    })
    links.push({
      label: "Snapshot trace",
      href: buildSnapshotTracePath(latestId),
    })
    links.push({
      label: "Evidence export anchor",
      href: buildSnapshotEvidenceExportPath(latestId),
    })
  }

  if (priorId) {
    links.push({
      label: "Prior snapshot",
      href: buildSnapshotDetailPath(priorId),
    })
  }

  if (latestId && priorId) {
    links.push({
      label: "Compare snapshots",
      href: buildSnapshotComparePath(priorId, latestId),
    })
  }

  if (traceabilityRefs.compareDriftDetected && latestId) {
    links.push({
      label: "Review compare drift",
      href: buildSnapshotComparePath(priorId ?? latestId, latestId),
    })
  }

  links.push({
    label: "Reconciliation dashboard (live)",
    href: `/finance/reconciliation?branchId=${encodeURIComponent(branchId)}&periodKey=${encodeURIComponent(periodKey)}`,
  })

  return links
}

export function formatMoneyDisplay(value: string | null): string {
  if (value === null || value.trim() === "") {
    return "—"
  }
  return value
}
