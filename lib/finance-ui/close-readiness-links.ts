import type { CloseChecklistItem } from "@/lib/finance/close-checklist-types"
import type { CloseReadinessResult } from "./close-readiness"
import { buildSnapshotDetailPath } from "./trace-links"

export type CloseReadinessNavLink = {
  label: string
  href: string
}

export function buildSnapshotComparePath(leftId: string, rightId: string): string {
  const params = new URLSearchParams({
    left: leftId,
    right: rightId,
  })
  return `/finance/reconciliation/snapshots/compare?${params.toString()}`
}

export function buildSnapshotEvidenceExportPath(snapshotId: string): string {
  return `${buildSnapshotDetailPath(snapshotId)}#snapshot-evidence-export`
}

export function buildSnapshotTracePath(snapshotId: string): string {
  return `${buildSnapshotDetailPath(snapshotId)}#snapshot-issues`
}

export function buildSnapshotsHistoryPath(branchId?: string): string {
  if (!branchId?.trim()) {
    return "/finance/reconciliation/snapshots"
  }
  const params = new URLSearchParams({ branchId: branchId.trim() })
  return `/finance/reconciliation/snapshots?${params.toString()}`
}

export function buildReconciliationDashboardPath(input?: {
  branchId?: string
  periodKey?: string
}): string {
  const params = new URLSearchParams()
  if (input?.branchId?.trim()) {
    params.set("branchId", input.branchId.trim())
  }
  if (input?.periodKey?.trim()) {
    params.set("periodKey", input.periodKey.trim())
  }
  const query = params.toString()
  return query ? `/finance/reconciliation?${query}` : "/finance/reconciliation"
}

function dedupeNavLinks(links: CloseReadinessNavLink[]): CloseReadinessNavLink[] {
  const seen = new Set<string>()
  const result: CloseReadinessNavLink[] = []

  for (const link of links) {
    const key = `${link.label}:${link.href}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    result.push(link)
  }

  return result
}

export function buildCloseReadinessQuickLinks(
  readiness: CloseReadinessResult
): CloseReadinessNavLink[] {
  const links: CloseReadinessNavLink[] = []
  const { period, latestSnapshotRef, priorSnapshotRef } = readiness

  if (latestSnapshotRef) {
    links.push({
      label: "Open latest snapshot",
      href: buildSnapshotDetailPath(latestSnapshotRef.id),
    })
    links.push({
      label: "Investigate frozen trace",
      href: buildSnapshotTracePath(latestSnapshotRef.id),
    })
    links.push({
      label: "Export evidence pack",
      href: buildSnapshotEvidenceExportPath(latestSnapshotRef.id),
    })

    if (priorSnapshotRef) {
      links.push({
        label: "Compare latest snapshots",
        href: buildSnapshotComparePath(
          priorSnapshotRef.id,
          latestSnapshotRef.id
        ),
      })
    }
  } else {
    links.push({
      label: "Capture reconciliation snapshot",
      href: buildReconciliationDashboardPath({
        branchId: period.branchId,
        periodKey: period.periodKey,
      }),
    })
  }

  links.push({
    label: "Snapshot history",
    href: buildSnapshotsHistoryPath(period.branchId),
  })

  links.push({
    label: "Live reconciliation",
    href: buildReconciliationDashboardPath({
      branchId: period.branchId,
      periodKey: period.periodKey,
    }),
  })

  return dedupeNavLinks(links)
}

export function resolveChecklistItemLinks(
  item: CloseChecklistItem,
  readiness: CloseReadinessResult
): CloseReadinessNavLink[] {
  const links: CloseReadinessNavLink[] = []
  const snapshotId = item.refs?.snapshotId ?? readiness.latestSnapshotRef?.id
  const { period } = readiness

  if (item.id === "snapshot-missing" || item.id === "reconciliation-no-snapshot") {
    return [
      {
        label: "Capture snapshot",
        href: buildReconciliationDashboardPath({
          branchId: period.branchId,
          periodKey: period.periodKey,
        }),
      },
      {
        label: "Snapshot history",
        href: buildSnapshotsHistoryPath(period.branchId),
      },
    ]
  }

  if (snapshotId) {
    links.push({
      label: "Open snapshot",
      href: buildSnapshotDetailPath(snapshotId),
    })
  }

  if (
    item.group === "reconciliation" &&
    (item.severity === "BLOCKED" || item.severity === "WARNING") &&
    snapshotId
  ) {
    links.push({
      label: "Investigate trace",
      href: buildSnapshotTracePath(snapshotId),
    })
  }

  if (item.group === "audit_evidence" && snapshotId) {
    links.push({
      label: "Export evidence",
      href: buildSnapshotEvidenceExportPath(snapshotId),
    })
  }

  if (
    item.id === "snapshot-compare-drift" &&
    item.refs?.compareSnapshotId &&
    snapshotId
  ) {
    links.push({
      label: "Compare snapshots",
      href: buildSnapshotComparePath(item.refs.compareSnapshotId, snapshotId),
    })
  }

  if (item.group === "snapshot_evidence" && snapshotId) {
    links.push({
      label: "View issues / trace",
      href: buildSnapshotTracePath(snapshotId),
    })
    links.push({
      label: "Evidence export",
      href: buildSnapshotEvidenceExportPath(snapshotId),
    })
  }

  if (
    item.refs?.compareSnapshotId &&
    snapshotId &&
    item.id !== "snapshot-compare-drift"
  ) {
    links.push({
      label: "Compare snapshots",
      href: buildSnapshotComparePath(item.refs.compareSnapshotId, snapshotId),
    })
  }

  return dedupeNavLinks(links)
}