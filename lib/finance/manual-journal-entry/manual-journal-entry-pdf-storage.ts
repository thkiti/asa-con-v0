import type {
  ManualJournalPdfReadRef,
  ManualJournalPdfStorageBackend,
  StoredManualJournalPdfRef,
} from "./manual-journal-entry-pdf-storage-types"
import {
  ManualJournalEntryError,
  ManualJournalEntryErrorCodes,
} from "./manual-journal-entry-errors"
import {
  readBlobManualJournalPdfFile,
  writeBlobManualJournalPdfFile,
} from "./manual-journal-entry-pdf-storage-blob"
import {
  readLocalManualJournalPdfFile,
  resolveLocalManualJournalPdfAbsolutePath,
  writeLocalManualJournalPdfFile,
} from "./manual-journal-entry-pdf-storage-local"
import { resolveManualJournalPdfBlobUrl } from "./manual-journal-entry-pdf-blob-url"
import { buildManualJournalPdfPathname } from "./manual-journal-entry-pdf-path"

export type {
  ManualJournalPdfReadRef,
  ManualJournalPdfStorageBackend,
  StoredManualJournalPdfRef,
} from "./manual-journal-entry-pdf-storage-types"
export { buildManualJournalPdfPathname as buildManualJournalPdfRelativePath }
export {
  getFinanceDocumentPdfRootDir,
  resolveLocalManualJournalPdfAbsolutePath as resolveManualJournalPdfAbsolutePath,
} from "./manual-journal-entry-pdf-storage-local"

/** Resolve storage backend: explicit env, else Blob on Vercel, else local filesystem. */
export function resolveManualJournalPdfStorageBackend(): ManualJournalPdfStorageBackend {
  const explicit = process.env.FINANCE_DOCUMENT_PDF_STORAGE?.trim().toLowerCase()
  if (explicit === "blob") return "blob"
  if (explicit === "filesystem" || explicit === "local") return "filesystem"
  if (process.env.VERCEL === "1") return "blob"
  return "filesystem"
}

export async function storeManualJournalPdf(
  entryId: string,
  buffer: Buffer,
  backend: ManualJournalPdfStorageBackend = resolveManualJournalPdfStorageBackend()
): Promise<StoredManualJournalPdfRef> {
  if (backend === "blob") {
    return writeBlobManualJournalPdfFile(entryId, buffer)
  }
  return writeLocalManualJournalPdfFile(entryId, buffer)
}

export async function readStoredManualJournalPdf(
  ref: ManualJournalPdfReadRef,
  backend: ManualJournalPdfStorageBackend = resolveManualJournalPdfStorageBackend()
): Promise<Buffer> {
  const resolvedBlobUrl = resolveManualJournalPdfBlobUrl(
    ref.pdfPath,
    ref.pdfBlobUrl
  )
  if (resolvedBlobUrl) {
    return readBlobManualJournalPdfFile({
      pdfPath: ref.pdfPath,
      pdfBlobUrl: resolvedBlobUrl,
    })
  }
  if (backend === "blob") {
    if (String(ref.pdfPath ?? "").trim()) {
      throw new ManualJournalEntryError(
        "Manual journal PDF snapshot metadata is incomplete (missing Blob URL)",
        ManualJournalEntryErrorCodes.PDF_METADATA_INCOMPLETE,
        404
      )
    }
    throw new ManualJournalEntryError(
      "Manual journal PDF snapshot file is missing from Blob storage",
      ManualJournalEntryErrorCodes.PDF_MISSING,
      404
    )
  }
  return readLocalManualJournalPdfFile(ref)
}

/** @deprecated Use storeManualJournalPdf */
export async function writeManualJournalPdfFile(
  entryId: string,
  buffer: Buffer
): Promise<string> {
  const stored = await storeManualJournalPdf(entryId, buffer, "filesystem")
  return stored.pdfPath
}

/** @deprecated Use readStoredManualJournalPdf */
export async function readManualJournalPdfFile(relativePath: string): Promise<Buffer> {
  return readStoredManualJournalPdf(
    { pdfPath: relativePath, pdfBlobUrl: null },
    "filesystem"
  )
}
