jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    documentArchive: {
      findFirst: jest.fn(),
    },
    documentArchiveLink: {
      findMany: jest.fn(),
    },
  },
}))

jest.mock("@/lib/auth", () => {
  const actual = jest.requireActual("@/lib/auth")
  return {
    ...actual,
    getSession: jest.fn(),
    requirePeriodAdminActor: jest.fn(),
  }
})

jest.mock("@/lib/document-archive/get-archive-status", () => ({
  getDocumentArchiveStatus: jest.fn(),
  loadActiveArchiveById: jest.fn(),
  loadActiveArchiveByDocumentRef: jest.fn(),
  safeArchiveDownloadFileName: jest.fn(() => "archive.pdf"),
}))

jest.mock("@/lib/document-archive/upload-archive", () => ({
  uploadDocumentArchive: jest.fn(),
}))

jest.mock("@/lib/document-archive/storage/store-archive-file", () => ({
  readStoredDocumentArchive: jest.fn(),
}))

import { NextRequest } from "next/server"
import { GET as statusRoute } from "@/app/api/document-archive/status/route"
import { POST as uploadRoute } from "@/app/api/document-archive/route"
import { GET as archiveFileRoute } from "@/app/api/document-archive/[archiveId]/file/route"
import { getSession, requirePeriodAdminActor } from "@/lib/auth"
import { getDocumentArchiveStatus, loadActiveArchiveById } from "@/lib/document-archive/get-archive-status"
import { readStoredDocumentArchive } from "@/lib/document-archive/storage/store-archive-file"
import { uploadDocumentArchive } from "@/lib/document-archive/upload-archive"
import { DocumentArchiveErrorCodes } from "@/lib/document-archive/errors"

const mockGetStatus = getDocumentArchiveStatus as jest.Mock
const mockUpload = uploadDocumentArchive as jest.Mock
const mockLoadById = loadActiveArchiveById as jest.Mock
const mockReadStored = readStoredDocumentArchive as jest.Mock
const sessionAs = { documentEntityCode: "AS" as const }

describe("document archive API routes", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getSession as jest.Mock).mockResolvedValue(sessionAs)
    ;(requirePeriodAdminActor as jest.Mock).mockReturnValue({
      staffId: "staff-1",
      role: "HO_FINANCE",
    })
  })

  it("GET status returns resolver payload", async () => {
    mockGetStatus.mockResolvedValue({
      pdfAvailable: false,
      archiveAvailable: null,
      source: "legacy",
      archiveId: null,
      fileName: null,
      mimeType: null,
      sizeBytes: null,
      archivedAt: null,
    })

    const res = await statusRoute(
      new NextRequest(
        "http://localhost/api/document-archive/status?documentKind=MJV&documentId=mjv-1&archiveKind=DOCUMENT_PDF&workflowStatus=POSTED"
      )
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({
        pdfAvailable: false,
        source: "legacy",
      })
    )
    expect(mockGetStatus).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        documentKind: "MJV",
        documentId: "mjv-1",
        archiveKind: "DOCUMENT_PDF",
      }),
      expect.objectContaining({ legalEntityCode: "AS" })
    )
  })

  it("POST upload creates archive via service", async () => {
    mockUpload.mockResolvedValue({
      ok: true,
      archiveId: "archive-1",
      archiveKind: "BANK_PAY_IN_SLIP",
      storagePath: "documents/vault/bank_pay_in_slip/AS/2026/06/a.jpg",
      storageUrl: null,
      fileName: "slip.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 10,
      checksum: "abc",
      archivedAt: "2026-06-30T00:00:00.000Z",
      linkIds: ["link-1", "link-2"],
    })

    const form = new FormData()
    form.set("archiveKind", "BANK_PAY_IN_SLIP")
    form.set(
      "links",
      JSON.stringify([
        { documentKind: "COL", documentId: "col-1", documentNo: "COL-1" },
        { documentKind: "COL", documentId: "col-2", documentNo: "COL-2" },
      ])
    )
    form.set("file", new File([Uint8Array.from([1, 2, 3])], "slip.jpg", { type: "image/jpeg" }))

    const res = await uploadRoute(
      new Request("http://localhost/api/document-archive", {
        method: "POST",
        body: form,
      })
    )

    expect(res.status).toBe(201)
    expect(mockUpload).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        archiveKind: "BANK_PAY_IN_SLIP",
        legalEntityCode: "AS",
        links: expect.arrayContaining([
          expect.objectContaining({ documentId: "col-1" }),
          expect.objectContaining({ documentId: "col-2" }),
        ]),
      })
    )
  })

  it("POST upload rejects invalid mime for DOCUMENT_PDF", async () => {
    const form = new FormData()
    form.set("archiveKind", "DOCUMENT_PDF")
    form.set(
      "links",
      JSON.stringify([
        { documentKind: "MJV", documentId: "mjv-1", documentNo: "MJV-1" },
      ])
    )
    form.set("file", new File([Uint8Array.from([1])], "x.png", { type: "image/png" }))

    const res = await uploadRoute(
      new Request("http://localhost/api/document-archive", {
        method: "POST",
        body: form,
      })
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({ code: DocumentArchiveErrorCodes.INVALID_MIME_TYPE })
    )
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it("POST upload rejects missing links", async () => {
    const form = new FormData()
    form.set("archiveKind", "DOCUMENT_PDF")
    form.set("links", "[]")
    form.set("file", new File([Uint8Array.from([1])], "x.pdf", { type: "application/pdf" }))

    const res = await uploadRoute(
      new Request("http://localhost/api/document-archive", {
        method: "POST",
        body: form,
      })
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual(
      expect.objectContaining({ code: DocumentArchiveErrorCodes.LINKS_REQUIRED })
    )
  })

  it("GET download returns active archive bytes only", async () => {
    mockLoadById.mockResolvedValue({
      id: "archive-1",
      archiveKind: "DOCUMENT_PDF",
      legalEntityCode: "AS",
      storagePath: "documents/vault/document_pdf/AS/2026/06/a.pdf",
      storageUrl: null,
      pdfPath: "documents/vault/document_pdf/AS/2026/06/a.pdf",
      pdfBlobUrl: null,
      fileName: "a.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4,
      archivedAt: new Date("2026-06-30T00:00:00.000Z"),
      status: "ACTIVE",
    })
    mockReadStored.mockResolvedValue(Buffer.from("%PDF"))

    const res = await archiveFileRoute(
      new NextRequest("http://localhost/api/document-archive/archive-1/file"),
      { params: Promise.resolve({ archiveId: "archive-1" }) }
    )

    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("application/pdf")
    expect(mockLoadById).toHaveBeenCalledWith(expect.anything(), "archive-1", "AS")
    expect(mockReadStored).toHaveBeenCalled()
  })

  it("GET download returns 404 for non-active archive", async () => {
    mockLoadById.mockResolvedValue(null)

    const res = await archiveFileRoute(
      new NextRequest("http://localhost/api/document-archive/archive-void/file"),
      { params: Promise.resolve({ archiveId: "archive-void" }) }
    )

    expect(res.status).toBe(404)
    expect(mockReadStored).not.toHaveBeenCalled()
  })
})
