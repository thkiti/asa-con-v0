import fs from "fs/promises"
import os from "os"
import path from "path"
import { resolveDocumentArchiveStorageBackend } from "@/lib/document-archive/storage/resolve-backend"
import {
  buildReceiptArchivePdfPathname,
  readStoredDocumentArchivePdf,
  resolveLocalDocumentArchivePdfAbsolutePath,
  storeDocumentArchivePdf,
} from "@/lib/document-archive/storage/storage"
import { bangkokInstant } from "@/lib/reporting/bangkok-calendar"

describe("document-archive storage backend resolution", () => {
  const originalStorage = process.env.DOCUMENT_ARCHIVE_PDF_STORAGE
  const originalVercel = process.env.VERCEL

  afterEach(() => {
    if (originalStorage === undefined) delete process.env.DOCUMENT_ARCHIVE_PDF_STORAGE
    else process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = originalStorage
    if (originalVercel === undefined) delete process.env.VERCEL
    else process.env.VERCEL = originalVercel
  })

  it("defaults to filesystem locally", () => {
    delete process.env.DOCUMENT_ARCHIVE_PDF_STORAGE
    delete process.env.VERCEL
    expect(resolveDocumentArchiveStorageBackend()).toBe("filesystem")
  })

  it("honors explicit blob and filesystem env", () => {
    process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = "blob"
    expect(resolveDocumentArchiveStorageBackend()).toBe("blob")

    process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = "local"
    expect(resolveDocumentArchiveStorageBackend()).toBe("filesystem")
  })

  it("selects blob on Vercel when env is unset", () => {
    delete process.env.DOCUMENT_ARCHIVE_PDF_STORAGE
    process.env.VERCEL = "1"
    expect(resolveDocumentArchiveStorageBackend()).toBe("blob")
  })
})

describe("document-archive storage (filesystem)", () => {
  let tempDir = ""

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "doc-archive-pdf-"))
    process.env.DOCUMENT_ARCHIVE_PDF_DIR = tempDir
    process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = "filesystem"
    delete process.env.VERCEL
  })

  afterEach(async () => {
    delete process.env.DOCUMENT_ARCHIVE_PDF_DIR
    delete process.env.DOCUMENT_ARCHIVE_PDF_STORAGE
    delete process.env.VERCEL
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it("writes and reads PDF under document archive root", async () => {
    const issuedAt = bangkokInstant(2026, 6, 1)
    const relativePath = buildReceiptArchivePdfPathname(
      "REC-SH001-202606-0001",
      issuedAt
    )
    const buffer = Buffer.from("%PDF-1.4 test")

    const stored = await storeDocumentArchivePdf(relativePath, buffer, "filesystem")
    expect(stored.pdfPath).toBe(relativePath)
    expect(stored.pdfBlobUrl).toBeNull()

    const absolutePath = resolveLocalDocumentArchivePdfAbsolutePath(relativePath)
    expect(absolutePath.startsWith(tempDir)).toBe(true)

    const readBack = await readStoredDocumentArchivePdf(
      { pdfPath: stored.pdfPath, pdfBlobUrl: null },
      "filesystem"
    )
    expect(readBack.equals(buffer)).toBe(true)
  })

  it("rejects path traversal", () => {
    expect(() => resolveLocalDocumentArchivePdfAbsolutePath("../escape.pdf")).toThrow(
      "Invalid document archive PDF path"
    )
    expect(() => resolveLocalDocumentArchivePdfAbsolutePath("/etc/passwd")).toThrow(
      "Invalid document archive PDF path"
    )
  })
})
