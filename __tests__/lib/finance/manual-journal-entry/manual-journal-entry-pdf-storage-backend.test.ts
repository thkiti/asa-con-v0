import {
  resolveManualJournalPdfStorageBackend,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-storage"

describe("resolveManualJournalPdfStorageBackend", () => {
  const original = {
    storage: process.env.FINANCE_DOCUMENT_PDF_STORAGE,
    vercel: process.env.VERCEL,
  }

  afterEach(() => {
    if (original.storage === undefined) {
      delete process.env.FINANCE_DOCUMENT_PDF_STORAGE
    } else {
      process.env.FINANCE_DOCUMENT_PDF_STORAGE = original.storage
    }
    if (original.vercel === undefined) {
      delete process.env.VERCEL
    } else {
      process.env.VERCEL = original.vercel
    }
  })

  it("defaults to filesystem locally", () => {
    delete process.env.FINANCE_DOCUMENT_PDF_STORAGE
    delete process.env.VERCEL
    expect(resolveManualJournalPdfStorageBackend()).toBe("filesystem")
  })

  it("uses blob on Vercel when not overridden", () => {
    delete process.env.FINANCE_DOCUMENT_PDF_STORAGE
    process.env.VERCEL = "1"
    expect(resolveManualJournalPdfStorageBackend()).toBe("blob")
  })

  it("honors explicit filesystem override on Vercel", () => {
    process.env.VERCEL = "1"
    process.env.FINANCE_DOCUMENT_PDF_STORAGE = "filesystem"
    expect(resolveManualJournalPdfStorageBackend()).toBe("filesystem")
  })
})
