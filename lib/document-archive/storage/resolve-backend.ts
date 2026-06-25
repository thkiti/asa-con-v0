import type { DocumentArchiveStorageBackend } from "../types"

/** Resolve storage backend: explicit env, else Blob on Vercel, else local filesystem. */
export function resolveDocumentArchiveStorageBackend(): DocumentArchiveStorageBackend {
  const explicit = process.env.DOCUMENT_ARCHIVE_PDF_STORAGE?.trim().toLowerCase()
  if (explicit === "blob") return "blob"
  if (explicit === "filesystem" || explicit === "local") return "filesystem"
  if (process.env.VERCEL === "1") return "blob"
  return "filesystem"
}
