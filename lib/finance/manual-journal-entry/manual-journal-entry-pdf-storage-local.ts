import fs from "fs/promises"
import path from "path"
import {
  ManualJournalEntryError,
  ManualJournalEntryErrorCodes,
} from "./manual-journal-entry-errors"
import { buildManualJournalPdfPathname } from "./manual-journal-entry-pdf-path"
import type {
  ManualJournalPdfReadRef,
  StoredManualJournalPdfRef,
} from "./manual-journal-entry-pdf-storage-types"

const DEFAULT_FINANCE_DOCUMENT_PDF_DIR = path.join(
  process.cwd(),
  "data",
  "finance-document-pdf"
)

export function getFinanceDocumentPdfRootDir(): string {
  const fromEnv = process.env.FINANCE_DOCUMENT_PDF_DIR?.trim()
  return fromEnv ? path.resolve(fromEnv) : DEFAULT_FINANCE_DOCUMENT_PDF_DIR
}

export function resolveLocalManualJournalPdfAbsolutePath(relativePath: string): string {
  const trimmed = String(relativePath ?? "").trim()
  if (!trimmed || trimmed.includes("..") || path.isAbsolute(trimmed)) {
    throw new ManualJournalEntryError(
      "Invalid manual journal PDF path",
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }

  const root = getFinanceDocumentPdfRootDir()
  const absolute = path.resolve(root, trimmed)
  const relative = path.relative(root, absolute)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new ManualJournalEntryError(
      "Manual journal PDF path escapes storage root",
      ManualJournalEntryErrorCodes.INVALID_LINE
    )
  }

  return absolute
}

export async function writeLocalManualJournalPdfFile(
  entryId: string,
  buffer: Buffer
): Promise<StoredManualJournalPdfRef> {
  const pdfPath = buildManualJournalPdfPathname(entryId)
  const absolutePath = resolveLocalManualJournalPdfAbsolutePath(pdfPath)
  await fs.mkdir(path.dirname(absolutePath), { recursive: true })
  await fs.writeFile(absolutePath, buffer)
  return { pdfPath, pdfBlobUrl: null }
}

export async function deleteLocalManualJournalPdfFile(
  relativePath: string
): Promise<void> {
  const trimmed = String(relativePath ?? "").trim()
  if (!trimmed) return

  try {
    const absolutePath = resolveLocalManualJournalPdfAbsolutePath(trimmed)
    await fs.unlink(absolutePath)
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as NodeJS.ErrnoException).code)
        : ""
    if (code === "ENOENT") return
    throw err
  }
}

export async function readLocalManualJournalPdfFile(
  ref: ManualJournalPdfReadRef
): Promise<Buffer> {
  try {
    const absolutePath = resolveLocalManualJournalPdfAbsolutePath(ref.pdfPath)
    return await fs.readFile(absolutePath)
  } catch {
    throw new ManualJournalEntryError(
      "Manual journal PDF snapshot file is missing from storage",
      ManualJournalEntryErrorCodes.PDF_MISSING,
      404
    )
  }
}
