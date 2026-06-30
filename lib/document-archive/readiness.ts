import { resolveDocumentArchivePdfBlobUrl } from "./blob-url"
import { resolveDocumentArchiveStorageBackend } from "./storage/resolve-backend"
import type {
  DocumentArchivePdfFields,
  DocumentArchiveReadinessStatus,
  DocumentArchiveStorageFields,
} from "./types"

export { resolveDocumentArchivePdfBlobUrl } from "./blob-url"

function resolveStoragePath(archive: DocumentArchiveStorageFields): string {
  return String(archive.storagePath ?? archive.pdfPath ?? "").trim()
}

function resolveStorageUrl(archive: DocumentArchiveStorageFields): string | null | undefined {
  return archive.storageUrl ?? archive.pdfBlobUrl
}

function isReadableArchiveStatus(status: string): boolean {
  return status === "ACTIVE" || status === "READY"
}

/** True when vault or legacy stored bytes can be read without re-rendering. */
export function isDocumentArchiveStorageReadable(
  archive: DocumentArchiveStorageFields
): boolean {
  const status = String(archive.status ?? "").trim()
  if (!isReadableArchiveStatus(status)) return false

  const storagePath = resolveStoragePath(archive)
  if (!storagePath) return false

  const backend = resolveDocumentArchiveStorageBackend()
  if (backend === "filesystem") return true

  return Boolean(
    resolveDocumentArchivePdfBlobUrl(storagePath, resolveStorageUrl(archive) ?? null)
  )
}

/** True when stored PDF bytes can be read without re-rendering. */
export function isDocumentArchivePdfReadable(
  archive: DocumentArchivePdfFields
): boolean {
  return isDocumentArchiveStorageReadable(archive)
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
