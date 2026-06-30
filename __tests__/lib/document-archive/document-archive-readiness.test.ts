import {
  buildDocumentArchiveReadinessPayload,
  isDocumentArchivePdfReadable,
  isDocumentArchiveStorageReadable,
  resolveDocumentArchivePdfBlobUrl,
  resolveDocumentArchiveReadinessStatus,
} from "@/lib/document-archive/readiness"

describe("document-archive readiness", () => {
  const originalStoreId = process.env.BLOB_STORE_ID
  const originalStorage = process.env.DOCUMENT_ARCHIVE_PDF_STORAGE

  afterEach(() => {
    if (originalStoreId === undefined) delete process.env.BLOB_STORE_ID
    else process.env.BLOB_STORE_ID = originalStoreId
    if (originalStorage === undefined) delete process.env.DOCUMENT_ARCHIVE_PDF_STORAGE
    else process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = originalStorage
    delete process.env.VERCEL
  })

  it("derives blob URL from pathname and store id", () => {
    process.env.BLOB_STORE_ID = "store_qqMba5XFbpW5TXcp"
    expect(
      resolveDocumentArchivePdfBlobUrl(
        "documents/receipt/2026/06/REC-SH001-202606-0001.pdf",
        null
      )
    ).toBe(
      "https://qqmba5xfbpw5txcp.public.blob.vercel-storage.com/documents/receipt/2026/06/REC-SH001-202606-0001.pdf"
    )
  })

  it("marks ACTIVE archive readable on filesystem backend", () => {
    process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = "filesystem"
    expect(
      isDocumentArchivePdfReadable({
        status: "ACTIVE",
        pdfPath: "documents/receipt/2026/06/REC-SH001-202606-0001.pdf",
        pdfBlobUrl: null,
      })
    ).toBe(true)
    expect(
      isDocumentArchiveStorageReadable({
        status: "ACTIVE",
        storagePath: "documents/receipt/2026/06/REC-SH001-202606-0001.pdf",
        pdfPath: null,
        pdfBlobUrl: null,
      })
    ).toBe(true)
    expect(resolveDocumentArchiveReadinessStatus({
      status: "ACTIVE",
      pdfPath: "documents/receipt/2026/06/REC-SH001-202606-0001.pdf",
      pdfBlobUrl: null,
    })).toBe("ready")
  })

  it("still accepts legacy READY status for pilot rows", () => {
    process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = "filesystem"
    expect(
      isDocumentArchivePdfReadable({
        status: "READY",
        pdfPath: "documents/receipt/2026/06/REC-SH001-202606-0001.pdf",
        pdfBlobUrl: null,
      })
    ).toBe(true)
  })

  it("marks PENDING when status is PENDING or pdfPath missing", () => {
    process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = "filesystem"
    expect(
      resolveDocumentArchiveReadinessStatus({
        status: "PENDING",
        pdfPath: null,
        pdfBlobUrl: null,
      })
    ).toBe("pending")
    expect(
      resolveDocumentArchiveReadinessStatus({
        status: "READY",
        pdfPath: null,
        pdfBlobUrl: null,
      })
    ).toBe("pending")
    expect(
      isDocumentArchivePdfReadable({
        status: "PENDING",
        pdfPath: "documents/receipt/2026/06/REC-SH001-202606-0001.pdf",
        pdfBlobUrl: null,
      })
    ).toBe(false)
  })

  it("marks FAILED and surfaces error message", () => {
    process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = "filesystem"
    expect(
      resolveDocumentArchiveReadinessStatus({
        status: "FAILED",
        pdfPath: null,
        pdfBlobUrl: null,
        errorMessage: "render timeout",
      })
    ).toBe("failed")
    expect(
      buildDocumentArchiveReadinessPayload({
        status: "FAILED",
        pdfPath: null,
        pdfBlobUrl: null,
        errorMessage: "render timeout",
      })
    ).toEqual({
      archiveStatus: "failed",
      archiveError: "render timeout",
    })
  })

  it("does not mark blob archive readable when URL cannot be resolved", () => {
    process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = "blob"
    delete process.env.BLOB_STORE_ID
    expect(
      isDocumentArchivePdfReadable({
        status: "READY",
        pdfPath: "documents/receipt/2026/06/REC-SH001-202606-0001.pdf",
        pdfBlobUrl: null,
      })
    ).toBe(false)
    expect(
      resolveDocumentArchiveReadinessStatus({
        status: "READY",
        pdfPath: "documents/receipt/2026/06/REC-SH001-202606-0001.pdf",
        pdfBlobUrl: null,
      })
    ).toBe("pending")
  })

  it("returns pending with attach error when attach fails", () => {
    process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = "filesystem"
    expect(
      buildDocumentArchiveReadinessPayload(
        { status: "PENDING", pdfPath: null, pdfBlobUrl: null },
        "upload failed"
      )
    ).toEqual({
      archiveStatus: "pending",
      archiveError: "upload failed",
    })
  })
})
