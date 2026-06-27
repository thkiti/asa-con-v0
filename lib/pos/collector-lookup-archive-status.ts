import type { CollectorLookupArchiveStatus } from "./collector-lookup-types"

export const COLLECTOR_LOOKUP_ARCHIVE_STATUS_LABEL: Record<
  CollectorLookupArchiveStatus,
  string
> = {
  ready: "Ready",
  pending: "Preparing...",
  failed: "Archive failed",
  legacy: "Legacy / no archive",
}

/** Collector PDF archive is not wired yet — all collector tickets resolve as legacy for lookup. */
export function resolveCollectorLookupArchiveStatus(): {
  archiveStatus: CollectorLookupArchiveStatus
  archiveStatusLabel: string
  archiveError?: string
  pdfReady: boolean
} {
  return {
    archiveStatus: "legacy",
    archiveStatusLabel: COLLECTOR_LOOKUP_ARCHIVE_STATUS_LABEL.legacy,
    pdfReady: false,
  }
}

export function buildCollectorLookupPdfUrl(collectorReportId: string): string {
  return `/api/pos/collectors/${encodeURIComponent(collectorReportId)}/pdf?disposition=inline`
}
