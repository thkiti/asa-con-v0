import { resolveManualJournalPdfBlobUrl } from "./manual-journal-entry-pdf-blob-url"
import { resolveManualJournalPdfStorageBackend } from "./manual-journal-entry-pdf-storage"

export type ManualJournalPdfSnapshotFields = {
  status: string
  pdfPath: string | null
  pdfBlobUrl?: string | null
}

export type ManualJournalPdfApiStatus = "ready" | "pending"

type AttachPdfResult = { ok: true } | { ok: false; error: string }

export { resolveManualJournalPdfBlobUrl } from "./manual-journal-entry-pdf-blob-url"

/** True when GET /pdf can read stored bytes without re-rendering. */
export function isManualJournalPdfReadable(
  entry: ManualJournalPdfSnapshotFields
): boolean {
  if (entry.status !== "POSTED") return false

  const pdfPath = String(entry.pdfPath ?? "").trim()
  if (!pdfPath) return false

  const backend = resolveManualJournalPdfStorageBackend()
  if (backend === "filesystem") return true

  return Boolean(resolveManualJournalPdfBlobUrl(pdfPath, entry.pdfBlobUrl))
}

export function buildManualJournalPdfApiPayload(
  entry: ManualJournalPdfSnapshotFields,
  attachResult?: AttachPdfResult | null
): {
  pdfStatus: ManualJournalPdfApiStatus
  pdfError?: string
} {
  const pdfError =
    attachResult && !attachResult.ok ? attachResult.error : undefined
  const pdfStatus: ManualJournalPdfApiStatus = isManualJournalPdfReadable(entry)
    ? "ready"
    : "pending"

  return pdfError ? { pdfStatus, pdfError } : { pdfStatus }
}
