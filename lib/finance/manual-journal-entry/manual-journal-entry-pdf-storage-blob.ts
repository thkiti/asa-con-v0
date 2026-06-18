import { put } from "@vercel/blob"
import { getBlobAuthConfig } from "@/lib/catalog-image/vercel-blob"
import {
  ManualJournalEntryError,
  ManualJournalEntryErrorCodes,
} from "./manual-journal-entry-errors"
import { buildManualJournalPdfPathname } from "./manual-journal-entry-pdf-path"
import type {
  ManualJournalPdfReadRef,
  StoredManualJournalPdfRef,
} from "./manual-journal-entry-pdf-storage-types"

function blobPutOptions() {
  const auth = getBlobAuthConfig()
  const options = {
    access: "public" as const,
    allowOverwrite: true,
    contentType: "application/pdf",
    addRandomSuffix: false,
  }
  if (auth.mode === "token") {
    return { ...options, token: auth.token }
  }
  return { ...options, oidcToken: auth.oidcToken, storeId: auth.storeId }
}

export async function writeBlobManualJournalPdfFile(
  entryId: string,
  buffer: Buffer
): Promise<StoredManualJournalPdfRef> {
  const pdfPath = buildManualJournalPdfPathname(entryId)

  try {
    const blob = await put(pdfPath, buffer, blobPutOptions())
    const pdfBlobUrl = String(blob.url ?? "").trim()
    if (!pdfBlobUrl) {
      throw new ManualJournalEntryError(
        "Blob upload succeeded without a URL",
        ManualJournalEntryErrorCodes.INVALID_LINE,
        500
      )
    }
    return {
      pdfPath: blob.pathname || pdfPath,
      pdfBlobUrl,
    }
  } catch (err: unknown) {
    if (err instanceof ManualJournalEntryError) {
      throw err
    }
    const message =
      err instanceof Error ? err.message : "Failed to upload manual journal PDF to Blob"
    throw new ManualJournalEntryError(message, ManualJournalEntryErrorCodes.INVALID_LINE, 500)
  }
}

export async function readBlobManualJournalPdfFile(
  ref: ManualJournalPdfReadRef
): Promise<Buffer> {
  const pdfBlobUrl = String(ref.pdfBlobUrl ?? "").trim()
  if (!pdfBlobUrl) {
    throw new ManualJournalEntryError(
      "Manual journal PDF snapshot is missing a Blob URL",
      ManualJournalEntryErrorCodes.PDF_MISSING,
      404
    )
  }

  try {
    const response = await fetch(pdfBlobUrl)
    if (!response.ok) {
      throw new ManualJournalEntryError(
        "Manual journal PDF snapshot file is missing from Blob storage",
        ManualJournalEntryErrorCodes.PDF_MISSING,
        404
      )
    }
    return Buffer.from(await response.arrayBuffer())
  } catch (err: unknown) {
    if (err instanceof ManualJournalEntryError) {
      throw err
    }
    throw new ManualJournalEntryError(
      "Manual journal PDF snapshot file is missing from Blob storage",
      ManualJournalEntryErrorCodes.PDF_MISSING,
      404
    )
  }
}
