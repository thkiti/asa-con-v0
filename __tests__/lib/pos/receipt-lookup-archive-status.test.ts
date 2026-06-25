import {
  buildReceiptLookupPdfUrl,
  resolveReceiptLookupArchiveStatus,
} from "@/lib/pos/receipt-lookup-archive-status"

describe("resolveReceiptLookupArchiveStatus", () => {
  it("returns legacy when no document archive exists", () => {
    expect(
      resolveReceiptLookupArchiveStatus({
        documentArchiveId: null,
        pdfPath: null,
        pdfBlobUrl: null,
        documentArchive: null,
      })
    ).toEqual({
      archiveStatus: "legacy",
      archiveStatusLabel: "Legacy / no archive",
      pdfReady: false,
    })
  })

  it("returns pending for PENDING archive without readable PDF", () => {
    expect(
      resolveReceiptLookupArchiveStatus({
        documentArchiveId: "arch-1",
        pdfPath: null,
        pdfBlobUrl: null,
        documentArchive: {
          status: "PENDING",
          pdfPath: null,
          pdfBlobUrl: null,
          errorMessage: null,
        },
      })
    ).toEqual({
      archiveStatus: "pending",
      archiveStatusLabel: "Preparing...",
      pdfReady: false,
    })
  })

  it("returns failed for FAILED archive", () => {
    expect(
      resolveReceiptLookupArchiveStatus({
        documentArchiveId: "arch-1",
        pdfPath: null,
        pdfBlobUrl: null,
        documentArchive: {
          status: "FAILED",
          pdfPath: null,
          pdfBlobUrl: null,
          errorMessage: "render timeout",
        },
      })
    ).toEqual({
      archiveStatus: "failed",
      archiveStatusLabel: "Archive failed",
      archiveError: "render timeout",
      pdfReady: false,
    })
  })

  it("returns ready when archive PDF is readable", () => {
    expect(
      resolveReceiptLookupArchiveStatus({
        documentArchiveId: "arch-1",
        pdfPath: "documents/receipt/2026/06/REC.pdf",
        pdfBlobUrl: null,
        documentArchive: {
          status: "READY",
          pdfPath: "documents/receipt/2026/06/REC.pdf",
          pdfBlobUrl: null,
          errorMessage: null,
        },
      })
    ).toEqual({
      archiveStatus: "ready",
      archiveStatusLabel: "Ready",
      pdfReady: true,
    })
  })
})

describe("buildReceiptLookupPdfUrl", () => {
  it("builds inline PDF API path", () => {
    expect(buildReceiptLookupPdfUrl("receipt-1")).toBe(
      "/api/pos/receipts/receipt-1/pdf?disposition=inline"
    )
  })
})
