import { access as fsAccess, rename } from "node:fs/promises"
import path from "node:path"
import {
  FINANCE_PRINT_FONT_FILE,
  resolveBundledFinancePrintFontPath,
  resolveFinancePrintFontPathForPdf,
} from "@/lib/finance/finance-print-font"
import {
  MANUAL_JOURNAL_PDF_THAI_FONT_FILE,
  resolveBundledThaiFontPathForPdf,
  resolveThaiFontPathForPdf,
} from "@/lib/finance/manual-journal-entry/pdf-font"

describe("pdf-font", () => {
  const fontPath = resolveBundledThaiFontPathForPdf()

  it("resolves bundled THSarabunNew.ttf under public/fonts", async () => {
    await expect(resolveThaiFontPathForPdf()).resolves.toBe(fontPath)
    await expect(resolveFinancePrintFontPathForPdf()).resolves.toBe(fontPath)
    await expect(fsAccess(fontPath)).resolves.toBeUndefined()
    expect(fontPath).toContain(path.join("public", "fonts", FINANCE_PRINT_FONT_FILE))
    expect(MANUAL_JOURNAL_PDF_THAI_FONT_FILE).toBe(FINANCE_PRINT_FONT_FILE)
    expect(resolveBundledFinancePrintFontPath()).toBe(fontPath)
  })

  it("falls back to local dev ASA-CON fonts when bundled font is moved aside", async () => {
    const originalPath = fontPath
    const backupPath = `${originalPath}.bak-test`
    const devFontPath = path.join("C:", "ASA-CON", "fonts", FINANCE_PRINT_FONT_FILE)

    let renamed = false
    try {
      await rename(originalPath, backupPath)
      renamed = true
      const resolved = await resolveThaiFontPathForPdf()
      expect(resolved.replace(/\\/g, "/")).toContain("ASA-CON/fonts/THSarabunNew.ttf")
      await expect(fsAccess(devFontPath)).resolves.toBeUndefined()
    } finally {
      if (renamed) {
        await rename(backupPath, originalPath)
      }
    }
  })
})
