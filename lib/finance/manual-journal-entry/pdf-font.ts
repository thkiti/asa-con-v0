import { readFile } from "node:fs/promises"
import path from "node:path"

/** Resolve a Thai-capable TTF for PDF text (local public/fonts first). */
export async function resolveThaiFontPathForPdf(): Promise<string | null> {
  const localCandidates = ["NotoSansThai-Regular.ttf", "THSarabunNew.ttf"].map((name) =>
    path.join(process.cwd(), "public", "fonts", name)
  )

  for (const localFontPath of localCandidates) {
    try {
      await readFile(localFontPath)
      return localFontPath
    } catch {
      // try next local candidate
    }
  }

  return null
}
