import type { DocumentArchiveStorageBackend, DocumentPdfReadRef } from "../types"
import { resolveDocumentArchiveStorageBackend } from "./resolve-backend"
import { readStoredDocumentArchivePdf, storeDocumentArchivePdf } from "./storage"

export type StoredDocumentArchiveRef = {
  storagePath: string
  storageUrl: string | null
}

export type DocumentArchiveReadRef = {
  storagePath?: string | null
  storageUrl?: string | null
  pdfPath?: string | null
  pdfBlobUrl?: string | null
}

function toPdfReadRef(ref: DocumentArchiveReadRef): DocumentPdfReadRef {
  const storagePath = String(ref.storagePath ?? ref.pdfPath ?? "").trim()
  return {
    pdfPath: storagePath,
    pdfBlobUrl: ref.storageUrl ?? ref.pdfBlobUrl ?? null,
  }
}

export async function storeDocumentArchiveFile(
  relativePath: string,
  buffer: Buffer,
  mimeType: string,
  backend: DocumentArchiveStorageBackend = resolveDocumentArchiveStorageBackend()
): Promise<StoredDocumentArchiveRef> {
  const stored = await storeDocumentArchivePdf(relativePath, buffer, backend, mimeType)
  return {
    storagePath: stored.pdfPath,
    storageUrl: stored.pdfBlobUrl,
  }
}

export async function readStoredDocumentArchive(
  ref: DocumentArchiveReadRef,
  backend: DocumentArchiveStorageBackend = resolveDocumentArchiveStorageBackend()
): Promise<Buffer> {
  return readStoredDocumentArchivePdf(toPdfReadRef(ref), backend)
}
