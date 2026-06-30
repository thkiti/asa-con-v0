import { resolveDocumentArchivePdfBlobUrl } from "../blob-url"
import {
  DocumentArchiveError,
  DocumentArchiveErrorCodes,
} from "../errors"
import type {
  DocumentArchiveStorageBackend,
  DocumentPdfReadRef,
  StoredDocumentPdfRef,
} from "../types"
import { resolveDocumentArchiveStorageBackend } from "./resolve-backend"
import {
  readBlobDocumentArchivePdfFile,
  writeBlobDocumentArchivePdfFile,
} from "./storage-blob"
import {
  getDocumentArchivePdfRootDir,
  readLocalDocumentArchivePdfFile,
  resolveLocalDocumentArchivePdfAbsolutePath,
  writeLocalDocumentArchivePdfFile,
} from "./storage-local"

export type {
  DocumentArchiveStorageBackend,
  DocumentPdfReadRef,
  StoredDocumentPdfRef,
} from "../types"

export { resolveDocumentArchiveStorageBackend } from "./resolve-backend"
export {
  getDocumentArchivePdfRootDir,
  resolveLocalDocumentArchivePdfAbsolutePath,
} from "./storage-local"
export { buildReceiptArchivePdfPathname, assertSafeReceiptNo } from "../paths/receipt"

export async function storeDocumentArchivePdf(
  relativePath: string,
  buffer: Buffer,
  backend: DocumentArchiveStorageBackend = resolveDocumentArchiveStorageBackend(),
  contentType = "application/pdf"
): Promise<StoredDocumentPdfRef> {
  if (backend === "blob") {
    return writeBlobDocumentArchivePdfFile(relativePath, buffer, contentType)
  }
  return writeLocalDocumentArchivePdfFile(relativePath, buffer)
}

export async function readStoredDocumentArchivePdf(
  ref: DocumentPdfReadRef,
  backend: DocumentArchiveStorageBackend = resolveDocumentArchiveStorageBackend()
): Promise<Buffer> {
  const resolvedBlobUrl = resolveDocumentArchivePdfBlobUrl(
    ref.pdfPath,
    ref.pdfBlobUrl
  )
  if (resolvedBlobUrl) {
    return readBlobDocumentArchivePdfFile({
      pdfPath: ref.pdfPath,
      pdfBlobUrl: resolvedBlobUrl,
    })
  }
  if (backend === "blob") {
    if (String(ref.pdfPath ?? "").trim()) {
      throw new DocumentArchiveError(
        "Document archive PDF snapshot metadata is incomplete (missing Blob URL)",
        DocumentArchiveErrorCodes.PDF_METADATA_INCOMPLETE,
        404
      )
    }
    throw new DocumentArchiveError(
      "Document archive PDF snapshot file is missing from Blob storage",
      DocumentArchiveErrorCodes.PDF_MISSING,
      404
    )
  }
  return readLocalDocumentArchivePdfFile(ref)
}
