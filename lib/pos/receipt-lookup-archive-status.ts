import {
  isDocumentArchivePdfReadable,
  resolveDocumentArchiveReadinessStatus,
} from "@/lib/document-archive/readiness"
import type { DocumentArchivePdfFields } from "@/lib/document-archive/types"
import type { ReceiptLookupArchiveStatus } from "./receipt-lookup-types"

export const RECEIPT_LOOKUP_ARCHIVE_STATUS_LABEL: Record<
  ReceiptLookupArchiveStatus,
  string
> = {
  ready: "Ready",
  pending: "Preparing...",
  failed: "Archive failed",
  legacy: "Legacy / no archive",
}

type ReceiptArchiveSource = {
  documentArchiveId: string | null
  pdfPath: string | null
  pdfBlobUrl?: string | null
  documentArchive?: DocumentArchivePdfFields | null
}

export function resolveReceiptLookupArchiveStatus(
  receipt: ReceiptArchiveSource
): {
  archiveStatus: ReceiptLookupArchiveStatus
  archiveStatusLabel: string
  archiveError?: string
  pdfReady: boolean
} {
  const archive = receipt.documentArchive
  if (!receipt.documentArchiveId || !archive) {
    return {
      archiveStatus: "legacy",
      archiveStatusLabel: RECEIPT_LOOKUP_ARCHIVE_STATUS_LABEL.legacy,
      pdfReady: false,
    }
  }

  const readiness = resolveDocumentArchiveReadinessStatus(archive)
  if (readiness === "failed") {
    const errorMessage = String(archive.errorMessage ?? "").trim()
    return {
      archiveStatus: "failed",
      archiveStatusLabel: RECEIPT_LOOKUP_ARCHIVE_STATUS_LABEL.failed,
      archiveError: errorMessage || undefined,
      pdfReady: false,
    }
  }

  const pdfReady = isDocumentArchivePdfReadable(archive)
  if (pdfReady) {
    return {
      archiveStatus: "ready",
      archiveStatusLabel: RECEIPT_LOOKUP_ARCHIVE_STATUS_LABEL.ready,
      pdfReady: true,
    }
  }

  return {
    archiveStatus: "pending",
    archiveStatusLabel: RECEIPT_LOOKUP_ARCHIVE_STATUS_LABEL.pending,
    pdfReady: false,
  }
}

export function buildReceiptLookupPdfUrl(receiptId: string): string {
  return `/api/pos/receipts/${encodeURIComponent(receiptId)}/pdf?disposition=inline`
}
