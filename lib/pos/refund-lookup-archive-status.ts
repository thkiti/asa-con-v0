import type { RefundLookupArchiveStatus } from "./refund-lookup-types"

export const REFUND_LOOKUP_ARCHIVE_STATUS_LABEL: Record<
  RefundLookupArchiveStatus,
  string
> = {
  ready: "Ready",
  pending: "Preparing...",
  failed: "Archive failed",
  legacy: "Legacy / no archive",
}

/** Refund PDF archive is not wired yet — all refunds resolve as legacy for lookup. */
export function resolveRefundLookupArchiveStatus(): {
  archiveStatus: RefundLookupArchiveStatus
  archiveStatusLabel: string
  archiveError?: string
  pdfReady: boolean
} {
  return {
    archiveStatus: "legacy",
    archiveStatusLabel: REFUND_LOOKUP_ARCHIVE_STATUS_LABEL.legacy,
    pdfReady: false,
  }
}

export function buildRefundLookupPdfUrl(refundId: string): string {
  return `/api/pos/refunds/${encodeURIComponent(refundId)}/pdf?disposition=inline`
}
