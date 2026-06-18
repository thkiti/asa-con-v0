import fs from "fs/promises"
import os from "os"
import path from "path"
import {
  buildManualJournalPdfRelativePath,
  readStoredManualJournalPdf,
  resolveManualJournalPdfAbsolutePath,
  storeManualJournalPdf,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-storage"

describe("manual-journal-entry-pdf-storage (filesystem)", () => {
  const entryId = "11111111-1111-1111-1111-111111111111"
  let tempDir = ""

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mjv-pdf-"))
    process.env.FINANCE_DOCUMENT_PDF_DIR = tempDir
    process.env.FINANCE_DOCUMENT_PDF_STORAGE = "filesystem"
    delete process.env.VERCEL
  })

  afterEach(async () => {
    delete process.env.FINANCE_DOCUMENT_PDF_DIR
    delete process.env.FINANCE_DOCUMENT_PDF_STORAGE
    delete process.env.VERCEL
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it("writes and reads PDF under finance document root", async () => {
    const relativePath = buildManualJournalPdfRelativePath(entryId)
    const buffer = Buffer.from("%PDF-1.4 test")

    const stored = await storeManualJournalPdf(entryId, buffer, "filesystem")
    expect(stored.pdfPath).toBe(relativePath)
    expect(stored.pdfBlobUrl).toBeNull()

    const absolutePath = resolveManualJournalPdfAbsolutePath(relativePath)
    expect(absolutePath.startsWith(tempDir)).toBe(true)

    const readBack = await readStoredManualJournalPdf(
      { pdfPath: stored.pdfPath, pdfBlobUrl: null },
      "filesystem"
    )
    expect(readBack.equals(buffer)).toBe(true)
  })

  it("rejects path traversal", async () => {
    expect(() => resolveManualJournalPdfAbsolutePath("../escape.pdf")).toThrow(
      "Invalid manual journal PDF path"
    )
  })
})
