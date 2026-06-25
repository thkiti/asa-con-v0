import { resolveDocumentArchivePdfBlobUrl } from "./blob-url"
import { resolveDocumentArchiveStorageBackend } from "./storage/resolve-backend"
import type {
  DocumentArchivePdfFields,
  DocumentArchiveReadinessStatus,
} from "./types"

export { resolveDocumentArchivePdfBlobUrl } from "./blob-url"

/** True when stored PDF bytes can be read without re-rendering. */
export function isDocumentArchivePdfReadable(
  archive: DocumentArchivePdfFields
): boolean {
  if (String(archive.status ?? "").trim() !== "READY") return false

  const pdfPath = String(archive.pdfPath ?? "").trim()
  if (!pdfPath) return false

  const backend = resolveDocumentArchiveStorageBackend()
  if (backend === "filesystem") return true

  return Boolean(resolveDocumentArchivePdfBlobUrl(pdfPath, archive.pdfBlobUrl))
}

export function resolveDocumentArchiveReadinessStatus(
  archive: DocumentArchivePdfFields
): DocumentArchiveReadinessStatus {
  if (String(archive.status ?? "").trim() === "FAILED") {
    return "failed"
  }
  if (isDocumentArchivePdfReadable(archive)) {
    return "ready"
  }
  return "pending"
}

export function buildDocumentArchiveReadinessPayload(
  archive: DocumentArchivePdfFields,
  attachError?: string | null
): {
  archiveStatus: DocumentArchiveReadinessStatus
  archiveError?: string
} {
  const archiveStatus = resolveDocumentArchiveReadinessStatus(archive)
  const errorFromAttach = String(attachError ?? "").trim()
  const errorFromArchive =
    archiveStatus === "failed" ? String(archive.errorMessage ?? "").trim() : ""

  const archiveError = errorFromAttach || errorFromArchive || undefined
  return archiveError ? { archiveStatus, archiveError } : { archiveStatus }
}
