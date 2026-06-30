import { put } from "@vercel/blob"
import { getBlobAuthConfig } from "@/lib/catalog-image/vercel-blob"
import {
  DocumentArchiveError,
  DocumentArchiveErrorCodes,
} from "../errors"
import type { DocumentPdfReadRef, StoredDocumentPdfRef } from "../types"

function blobPutOptions(contentType: string) {
  const auth = getBlobAuthConfig()
  const options = {
    access: "public" as const,
    allowOverwrite: true,
    contentType,
    addRandomSuffix: false,
  }
  if (auth.mode === "token") {
    return { ...options, token: auth.token }
  }
  return { ...options, oidcToken: auth.oidcToken, storeId: auth.storeId }
}

export async function writeBlobDocumentArchivePdfFile(
  relativePath: string,
  buffer: Buffer,
  contentType = "application/pdf"
): Promise<StoredDocumentPdfRef> {
  const pdfPath = String(relativePath ?? "").trim()
  if (!pdfPath) {
    throw new DocumentArchiveError(
      "Invalid document archive PDF path",
      DocumentArchiveErrorCodes.INVALID_PATH
    )
  }

  try {
    const blob = await put(pdfPath, buffer, blobPutOptions(contentType))
    const pdfBlobUrl = String(blob.url ?? "").trim()
    if (!pdfBlobUrl) {
      throw new DocumentArchiveError(
        "Blob upload succeeded without a URL",
        DocumentArchiveErrorCodes.INVALID_PATH,
        500
      )
    }
    return {
      pdfPath: blob.pathname || pdfPath,
      pdfBlobUrl,
    }
  } catch (err: unknown) {
    if (err instanceof DocumentArchiveError) {
      throw err
    }
    const message =
      err instanceof Error ? err.message : "Failed to upload document archive PDF to Blob"
    throw new DocumentArchiveError(message, DocumentArchiveErrorCodes.INVALID_PATH, 500)
  }
}

export async function readBlobDocumentArchivePdfFile(
  ref: DocumentPdfReadRef
): Promise<Buffer> {
  const pdfBlobUrl = String(ref.pdfBlobUrl ?? "").trim()
  if (!pdfBlobUrl) {
    throw new DocumentArchiveError(
      "Document archive PDF snapshot is missing a Blob URL",
      DocumentArchiveErrorCodes.PDF_MISSING,
      404
    )
  }

  try {
    const response = await fetch(pdfBlobUrl)
    if (!response.ok) {
      throw new DocumentArchiveError(
        "Document archive PDF snapshot file is missing from Blob storage",
        DocumentArchiveErrorCodes.PDF_MISSING,
        404
      )
    }
    return Buffer.from(await response.arrayBuffer())
  } catch (err: unknown) {
    if (err instanceof DocumentArchiveError) {
      throw err
    }
    throw new DocumentArchiveError(
      "Document archive PDF snapshot file is missing from Blob storage",
      DocumentArchiveErrorCodes.PDF_MISSING,
      404
    )
  }
}
