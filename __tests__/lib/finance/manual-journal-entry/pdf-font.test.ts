import { access, rename } from "node:fs/promises"
import path from "node:path"
import {
  MANUAL_JOURNAL_PDF_THAI_FONT_FILE,
  resolveBundledThaiFontPathForPdf,
  resolveThaiFontPathForPdf,
} from "@/lib/finance/manual-journal-entry/pdf-font"
import { ManualJournalEntryErrorCodes } from "@/lib/finance/manual-journal-entry/manual-journal-entry-errors"

describe("pdf-font", () => {
  const fontPath = resolveBundledThaiFontPathForPdf()

  it("resolves bundled NotoSansThai-Regular.ttf under public/fonts", async () => {
    await expect(resolveThaiFontPathForPdf()).resolves.toBe(fontPath)
    await expect(access(fontPath)).resolves.toBeUndefined()
    expect(fontPath).toContain(path.join("public", "fonts", MANUAL_JOURNAL_PDF_THAI_FONT_FILE))
  })

  it("throws PDF_FONT_MISSING when bundled font is absent", async () => {
    const missingPath = path.join(process.cwd(), "public", "fonts", "__missing-test__.ttf")
    const originalPath = fontPath
    const backupPath = `${originalPath}.bak-test`

    let renamed = false
    try {
      await rename(originalPath, backupPath)
      renamed = true
      await expect(resolveThaiFontPathForPdf()).rejects.toMatchObject({
        code: ManualJournalEntryErrorCodes.PDF_FONT_MISSING,
      })
    } finally {
      if (renamed) {
        await rename(backupPath, originalPath)
      }
    }
  })
})
