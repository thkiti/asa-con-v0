import { access } from "node:fs/promises"
import path from "node:path"
import {
  ManualJournalEntryError,
  ManualJournalEntryErrorCodes,
} from "./manual-journal-entry-errors"

export const MANUAL_JOURNAL_PDF_THAI_FONT_FILE = "NotoSansThai-Regular.ttf"

/** Absolute path to the bundled Thai TTF under public/fonts (committed in repo). */
export function resolveBundledThaiFontPathForPdf(): string {
  return path.join(process.cwd(), "public", "fonts", MANUAL_JOURNAL_PDF_THAI_FONT_FILE)
}

/**
 * Resolve bundled Noto Sans Thai for PDFKit. Fails clearly if the font asset is missing.
 * No network fetch and no Helvetica fallback.
 */
export async function resolveThaiFontPathForPdf(): Promise<string> {
  const fontPath = resolveBundledThaiFontPathForPdf()
  try {
    await access(fontPath)
    return fontPath
  } catch {
    throw new ManualJournalEntryError(
      `Thai PDF font is missing at public/fonts/${MANUAL_JOURNAL_PDF_THAI_FONT_FILE}. Commit the bundled Noto Sans Thai font before generating manual journal PDFs.`,
      ManualJournalEntryErrorCodes.PDF_FONT_MISSING,
      500
    )
  }
}
