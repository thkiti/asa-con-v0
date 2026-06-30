import {
  ensureLegacyMjvArchiveLink,
  ensureLegacyReceiptArchiveLink,
} from "@/lib/document-archive/legacy-bridge"
import { resolvePdfAvailable } from "@/lib/document-archive/resolve-pdf-available"

function createMockDb() {
  const linkFindFirst = jest.fn().mockResolvedValue(null)
  const linkCreate = jest.fn().mockImplementation(async ({ data }) => ({
    id: `link-${data.documentId}`,
    ...data,
  }))
  const archiveCreate = jest.fn().mockImplementation(async ({ data }) => ({
    id: "archive-new",
    ...data,
  }))
  const archiveUpdate = jest.fn().mockResolvedValue({})
  const receiptUpdate = jest.fn().mockResolvedValue({})

  const tx = {
    documentArchiveLink: {
      findFirst: linkFindFirst,
      create: linkCreate,
    },
    documentArchive: {
      create: archiveCreate,
      update: archiveUpdate,
    },
    receipt: {
      update: receiptUpdate,
    },
  }

  return {
    db: {
      $transaction: jest.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
      documentArchiveLink: { findFirst: linkFindFirst },
      manualJournalEntry: { findFirst: jest.fn() },
      receipt: { findUnique: jest.fn(), update: receiptUpdate },
      documentArchive: {
        create: archiveCreate,
        update: archiveUpdate,
      },
    },
    tx,
    linkFindFirst,
    linkCreate,
    archiveCreate,
    archiveUpdate,
  }
}

describe("legacy archive bridge", () => {
  it("creates MJV link metadata without duplicating stored files", async () => {
    const { db, archiveCreate, linkCreate } = createMockDb()
    ;(db.manualJournalEntry.findFirst as jest.Mock).mockResolvedValue({
      id: "mjv-1",
      entryNo: "MJV-001",
      status: "POSTED",
      legalEntityCode: "AS",
      branchId: "branch-1",
      pdfPath: "manual-journal/mjv-1.pdf",
      pdfBlobUrl: null,
      pdfGeneratedAt: new Date("2026-06-30T00:00:00.000Z"),
    })

    const result = await ensureLegacyMjvArchiveLink(db as never, {
      documentKind: "MJV",
      manualJournalEntryId: "mjv-1",
      legalEntityCode: "AS",
    })

    expect(result).toEqual({
      archiveId: "archive-new",
      linkId: "link-mjv-1",
      created: true,
    })
    expect(archiveCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          storagePath: "manual-journal/mjv-1.pdf",
          pdfPath: "manual-journal/mjv-1.pdf",
          status: "ACTIVE",
        }),
      })
    )
    expect(linkCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          documentKind: "MJV",
          documentId: "mjv-1",
        }),
      })
    )
  })

  it("does not duplicate link rows on repeated ensure calls", async () => {
    const { db, linkFindFirst, linkCreate } = createMockDb()
    ;(db.manualJournalEntry.findFirst as jest.Mock).mockResolvedValue({
      id: "mjv-1",
      entryNo: "MJV-001",
      status: "POSTED",
      legalEntityCode: "AS",
      branchId: "branch-1",
      pdfPath: "manual-journal/mjv-1.pdf",
      pdfBlobUrl: null,
      pdfGeneratedAt: new Date(),
    })

    const first = await ensureLegacyMjvArchiveLink(db as never, {
      documentKind: "MJV",
      manualJournalEntryId: "mjv-1",
    })

    linkFindFirst.mockResolvedValue({
      id: "link-existing",
      archiveId: "archive-existing",
    })

    const second = await ensureLegacyMjvArchiveLink(db as never, {
      documentKind: "MJV",
      manualJournalEntryId: "mjv-1",
    })

    expect(first?.created).toBe(true)
    expect(second).toEqual({
      archiveId: "archive-existing",
      linkId: "link-existing",
      created: false,
    })
    expect(linkCreate).toHaveBeenCalledTimes(1)
  })

  it("bridges legacy receipt pilot archive to REC link", async () => {
    const { db, archiveUpdate, linkCreate } = createMockDb()
    ;(db.receipt.findUnique as jest.Mock).mockResolvedValue({
      id: "receipt-1",
      receiptNo: "REC-001",
      branchId: "branch-1",
      pdfPath: "documents/receipt/2026/06/REC-001.pdf",
      pdfBlobUrl: null,
      pdfGeneratedAt: new Date(),
      documentArchiveId: "archive-pilot",
      documentArchive: {
        id: "archive-pilot",
        status: "READY",
        archiveKind: "DOCUMENT_PDF",
        storagePath: null,
        storageUrl: null,
        pdfPath: "documents/receipt/2026/06/REC-001.pdf",
        pdfBlobUrl: null,
        fileName: null,
        mimeType: "application/pdf",
        legalEntityCode: null,
        branchId: "branch-1",
        generatedAt: new Date(),
        archivedAt: null,
        documentType: "RECEIPT",
        documentId: "receipt-1",
        documentNo: "REC-001",
      },
    })

    const result = await ensureLegacyReceiptArchiveLink(db as never, {
      receiptId: "receipt-1",
    })

    expect(result?.archiveId).toBe("archive-pilot")
    expect(archiveUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "archive-pilot" },
        data: expect.objectContaining({
          archiveKind: "RECEIPT_SLIP",
          status: "ACTIVE",
          storagePath: "documents/receipt/2026/06/REC-001.pdf",
        }),
      })
    )
    expect(linkCreate).toHaveBeenCalled()
  })
})

describe("legacy resolver tri-state", () => {
  const originalStorage = process.env.DOCUMENT_ARCHIVE_PDF_STORAGE

  afterEach(() => {
    if (originalStorage === undefined) delete process.env.DOCUMENT_ARCHIVE_PDF_STORAGE
    else process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = originalStorage
  })

  it("returns null for unposted MJV without archive", () => {
    expect(
      resolvePdfAvailable({
        documentKind: "MJV",
        documentId: "mjv-draft",
        archiveKind: "DOCUMENT_PDF",
        workflowStatus: "CONFIRMED",
      })
    ).toBe(null)
  })

  it("returns false for posted MJV missing archive", () => {
    process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = "filesystem"
    expect(
      resolvePdfAvailable({
        documentKind: "MJV",
        documentId: "mjv-1",
        archiveKind: "DOCUMENT_PDF",
        workflowStatus: "POSTED",
        legacyPdfPath: null,
      })
    ).toBe(false)
  })

  it("returns true for posted MJV with legacy pdfPath", () => {
    process.env.DOCUMENT_ARCHIVE_PDF_STORAGE = "filesystem"
    expect(
      resolvePdfAvailable({
        documentKind: "MJV",
        documentId: "mjv-1",
        archiveKind: "DOCUMENT_PDF",
        workflowStatus: "POSTED",
        legacyPdfPath: "manual-journal/mjv-1.pdf",
      })
    ).toBe(true)
  })
})
