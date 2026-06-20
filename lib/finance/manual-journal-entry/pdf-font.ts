import {
  FINANCE_PRINT_FONT_FILE,
  resolveBundledFinancePrintFontPath,
  resolveFinancePrintFontPathForPdf,
} from "@/lib/finance/finance-print-font"

/** @deprecated Use FINANCE_PRINT_FONT_FILE from finance-print-font. */
export const MANUAL_JOURNAL_PDF_THAI_FONT_FILE = FINANCE_PRINT_FONT_FILE

/** Absolute path to the bundled finance print TTF under public/fonts. */
export function resolveBundledThaiFontPathForPdf(): string {
  return resolveBundledFinancePrintFontPath()
}

/** Resolve THSarabunNew for manual journal PDFKit rendering. */
export async function resolveThaiFontPathForPdf(): Promise<string> {
  return resolveFinancePrintFontPathForPdf()
}
