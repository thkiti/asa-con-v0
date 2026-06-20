import { access } from "node:fs/promises"
import path from "node:path"
import {
  ManualJournalEntryError,
  ManualJournalEntryErrorCodes,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-errors"

/** Standard finance print / PDF font (A4 vouchers and reports). */
export const FINANCE_PRINT_FONT_FILE = "THSarabunNew.ttf"

const LOCAL_DEV_FONT_DIRS = [
  path.join("C:", "ASA-CON", "fonts"),
  path.join(process.env.LOCALAPPDATA ?? "", "ASA-CON", "fonts"),
] as const

/** Absolute path to the bundled TTF under public/fonts. */
export function resolveBundledFinancePrintFontPath(): string {
  return path.join(process.cwd(), "public", "fonts", FINANCE_PRINT_FONT_FILE)
}

async function canReadFont(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Resolve THSarabunNew for server-side PDF generation.
 * Order: public/fonts → local dev ASA-CON fonts directory.
 */
export async function resolveFinancePrintFontPathForPdf(): Promise<string> {
  const bundled = resolveBundledFinancePrintFontPath()
  if (await canReadFont(bundled)) {
    return bundled
  }

  for (const dir of LOCAL_DEV_FONT_DIRS) {
    const candidate = path.join(dir, FINANCE_PRINT_FONT_FILE)
    if (await canReadFont(candidate)) {
      return candidate
    }
  }

  throw new ManualJournalEntryError(
    `Finance print font is missing. Commit public/fonts/${FINANCE_PRINT_FONT_FILE} or install it under C:\\ASA-CON\\fonts before generating finance PDFs.`,
    ManualJournalEntryErrorCodes.PDF_FONT_MISSING,
    500
  )
}
