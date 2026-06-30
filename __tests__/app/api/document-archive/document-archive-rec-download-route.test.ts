jest.mock("@/lib/document-archive/get-archive-status", () => ({
  ...jest.requireActual("@/lib/document-archive/get-archive-status"),
  loadActiveArchiveByDocumentRefWithBridge: jest.fn(),
}))

jest.mock("@/lib/document-archive/storage/store-archive-file", () => ({
  readStoredDocumentArchive: jest.fn(),
}))

import { NextRequest } from "next/server"
import { GET as recDownloadRoute } from "@/app/api/document-archive/by-document/[documentKind]/[documentId]/file/route"
import { loadActiveArchiveByDocumentRefWithBridge } from "@/lib/document-archive/get-archive-status"
import { readStoredDocumentArchive } from "@/lib/document-archive/storage/store-archive-file"

jest.mock("@/lib/shared/prisma", () => ({ prisma: {} }))

jest.mock("@/lib/auth", () => {
  const actual = jest.requireActual("@/lib/auth")
  return {
    ...actual,
    getSession: jest.fn().mockResolvedValue({ documentEntityCode: "AS" }),
    requirePeriodAdminActor: jest.fn().mockReturnValue({
      staffId: "staff-1",
      role: "HO_FINANCE",
    }),
  }
})

const mockLoad = loadActiveArchiveByDocumentRefWithBridge as jest.Mock
const mockRead = readStoredDocumentArchive as jest.Mock

describe("REC by-document download bridge", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRead.mockResolvedValue(Buffer.from("%PDF"))
  })

  it("downloads bridged receipt archive bytes", async () => {
    mockLoad.mockResolvedValue({
      id: "archive-pilot",
      archiveKind: "RECEIPT_SLIP",
      legalEntityCode: "AS",
      storagePath: "documents/receipt/2026/06/REC-001.pdf",
      storageUrl: null,
      pdfPath: "documents/receipt/2026/06/REC-001.pdf",
      pdfBlobUrl: null,
      fileName: "REC-001.pdf",
      mimeType: "application/pdf",
      sizeBytes: 10,
      archivedAt: new Date(),
      status: "ACTIVE",
    })

    const res = await recDownloadRoute(
      new NextRequest(
        "http://localhost/api/document-archive/by-document/REC/receipt-1/file?archiveKind=RECEIPT_SLIP"
      ),
      { params: Promise.resolve({ documentKind: "REC", documentId: "receipt-1" }) }
    )

    expect(res.status).toBe(200)
    expect(mockLoad).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        documentKind: "REC",
        documentId: "receipt-1",
        archiveKind: "RECEIPT_SLIP",
      })
    )
    expect(mockRead).toHaveBeenCalled()
  })
})
