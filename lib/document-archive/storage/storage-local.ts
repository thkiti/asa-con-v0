import fs from "fs/promises"
import path from "path"
import {
  DocumentArchiveError,
  DocumentArchiveErrorCodes,
} from "../errors"
import type { DocumentPdfReadRef, StoredDocumentPdfRef } from "../types"

const DEFAULT_DOCUMENT_ARCHIVE_PDF_DIR = path.join(
  process.cwd(),
  "data",
  "document-archive"
)

export function getDocumentArchivePdfRootDir(): string {
  const fromEnv = process.env.DOCUMENT_ARCHIVE_PDF_DIR?.trim()
  return fromEnv ? path.resolve(fromEnv) : DEFAULT_DOCUMENT_ARCHIVE_PDF_DIR
}

export function resolveLocalDocumentArchivePdfAbsolutePath(
  relativePath: string
): string {
  const trimmed = String(relativePath ?? "").trim()
  if (!trimmed || trimmed.includes("..") || path.isAbsolute(trimmed)) {
    throw new DocumentArchiveError(
      "Invalid document archive PDF path",
      DocumentArchiveErrorCodes.INVALID_PATH
    )
  }

  const root = getDocumentArchivePdfRootDir()
  const absolute = path.resolve(root, trimmed)
  const relative = path.relative(root, absolute)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new DocumentArchiveError(
      "Document archive PDF path escapes storage root",
      DocumentArchiveErrorCodes.INVALID_PATH
    )
  }

  return absolute
}

export async function writeLocalDocumentArchivePdfFile(
  relativePath: string,
  buffer: Buffer
): Promise<StoredDocumentPdfRef> {
  const pdfPath = String(relativePath ?? "").trim()
  const absolutePath = resolveLocalDocumentArchivePdfAbsolutePath(pdfPath)
  await fs.mkdir(path.dirname(absolutePath), { recursive: true })
  await fs.writeFile(absolutePath, buffer)
  return { pdfPath, pdfBlobUrl: null }
}

export async function readLocalDocumentArchivePdfFile(
  ref: DocumentPdfReadRef
): Promise<Buffer> {
  try {
    const absolutePath = resolveLocalDocumentArchivePdfAbsolutePath(ref.pdfPath)
    return await fs.readFile(absolutePath)
  } catch {
    throw new DocumentArchiveError(
      "Document archive PDF snapshot file is missing from storage",
      DocumentArchiveErrorCodes.PDF_MISSING,
      404
    )
  }
}
