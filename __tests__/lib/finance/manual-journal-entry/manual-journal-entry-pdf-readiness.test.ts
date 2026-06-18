import {
  buildManualJournalPdfApiPayload,
  isManualJournalPdfReadable,
  resolveManualJournalPdfBlobUrl,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-readiness"

describe("manual-journal-entry-pdf-readiness", () => {
  const originalStoreId = process.env.BLOB_STORE_ID
  const originalStorage = process.env.FINANCE_DOCUMENT_PDF_STORAGE

  afterEach(() => {
    if (originalStoreId === undefined) delete process.env.BLOB_STORE_ID
    else process.env.BLOB_STORE_ID = originalStoreId
    if (originalStorage === undefined) delete process.env.FINANCE_DOCUMENT_PDF_STORAGE
    else process.env.FINANCE_DOCUMENT_PDF_STORAGE = originalStorage
    delete process.env.VERCEL
  })

  it("derives blob URL from pathname and store id", () => {
    process.env.BLOB_STORE_ID = "store_qqMba5XFbpW5TXcp"
    expect(
      resolveManualJournalPdfBlobUrl("manual-journal/entry-1.pdf", null)
    ).toBe(
      "https://qqmba5xfbpw5txcp.public.blob.vercel-storage.com/manual-journal/entry-1.pdf"
    )
  })

  it("prefers explicit pdfBlobUrl", () => {
    expect(
      resolveManualJournalPdfBlobUrl(
        "manual-journal/entry-1.pdf",
        "https://blob.example/explicit.pdf"
      )
    ).toBe("https://blob.example/explicit.pdf")
  })

  it("marks blob entry readable when pathname can resolve URL", () => {
    process.env.FINANCE_DOCUMENT_PDF_STORAGE = "blob"
    process.env.BLOB_STORE_ID = "store_qqMba5XFbpW5TXcp"
    expect(
      isManualJournalPdfReadable({
        status: "POSTED",
        pdfPath: "manual-journal/entry-1.pdf",
        pdfBlobUrl: null,
      })
    ).toBe(true)
  })

  it("does not mark blob entry readable when URL cannot be resolved", () => {
    process.env.FINANCE_DOCUMENT_PDF_STORAGE = "blob"
    delete process.env.BLOB_STORE_ID
    expect(
      isManualJournalPdfReadable({
        status: "POSTED",
        pdfPath: "manual-journal/entry-1.pdf",
        pdfBlobUrl: null,
      })
    ).toBe(false)
  })

  it("returns pending with pdfError when attach fails", () => {
    process.env.FINANCE_DOCUMENT_PDF_STORAGE = "filesystem"
    expect(
      buildManualJournalPdfApiPayload(
        { status: "POSTED", pdfPath: null, pdfBlobUrl: null },
        { ok: false, error: "blob already exists" }
      )
    ).toEqual({
      pdfStatus: "pending",
      pdfError: "blob already exists",
    })
  })

  it("returns ready when readable metadata exists", () => {
    process.env.FINANCE_DOCUMENT_PDF_STORAGE = "filesystem"
    expect(
      buildManualJournalPdfApiPayload({
        status: "POSTED",
        pdfPath: "manual-journal/entry-1.pdf",
        pdfBlobUrl: null,
      })
    ).toEqual({ pdfStatus: "ready" })
  })
})
