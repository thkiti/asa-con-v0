jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    manualJournalEntry: {
      findUnique: jest.fn(),
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

jest.mock("@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-storage", () => ({
  readStoredManualJournalPdf: jest.fn(),
}))

import { NextRequest } from "next/server"
import { GET as pdfRoute } from "@/app/api/finance/manual-journal-entries/[id]/pdf/route"
import { getSession, requirePeriodAdminActor } from "@/lib/auth"
import { ManualJournalEntryErrorCodes } from "@/lib/finance/manual-journal-entry/manual-journal-entry-errors"
import { readStoredManualJournalPdf } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-storage"
import { prisma } from "@/lib/shared/prisma"

const mockFindUnique = prisma.manualJournalEntry.findUnique as jest.Mock
const mockReadPdf = readStoredManualJournalPdf as jest.Mock
const context = { params: Promise.resolve({ id: "entry-1" }) }

describe("GET manual-journal-entries/[id]/pdf", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getSession as jest.Mock).mockResolvedValue({})
    ;(requirePeriodAdminActor as jest.Mock).mockReturnValue({
      staffId: "staff-1",
    })
  })

  it("returns stored PDF bytes for posted entry", async () => {
    mockFindUnique.mockResolvedValue({
      status: "POSTED",
      pdfPath: "manual-journal/entry-1.pdf",
      pdfBlobUrl: "https://blob.example/manual-journal/entry-1.pdf",
      entryNo: "MAJ-260001",
    })
    mockReadPdf.mockResolvedValue(Buffer.from("%PDF"))

    const res = await pdfRoute(
      new NextRequest(
        "http://localhost/api/finance/manual-journal-entries/entry-1/pdf?disposition=inline"
      ),
      context
    )

    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("application/pdf")
    expect(res.headers.get("Content-Disposition")).toContain("inline")
    expect(mockReadPdf).toHaveBeenCalledWith({
      pdfPath: "manual-journal/entry-1.pdf",
      pdfBlobUrl: "https://blob.example/manual-journal/entry-1.pdf",
    })
  })

  it("returns PDF_PENDING when posted entry has no pdfPath", async () => {
    mockFindUnique.mockResolvedValue({
      status: "POSTED",
      pdfPath: null,
      pdfBlobUrl: null,
      entryNo: "MAJ-260001",
    })

    const res = await pdfRoute(
      new NextRequest("http://localhost/api/finance/manual-journal-entries/entry-1/pdf"),
      context
    )

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({ code: "PDF_PENDING" })
    expect(mockReadPdf).not.toHaveBeenCalled()
  })

  it("returns PDF_MISSING when stored blob/file is gone", async () => {
    mockFindUnique.mockResolvedValue({
      status: "POSTED",
      pdfPath: "manual-journal/entry-1.pdf",
      pdfBlobUrl: "https://blob.example/manual-journal/entry-1.pdf",
      entryNo: "MAJ-260001",
    })
    const { ManualJournalEntryError } = await import(
      "@/lib/finance/manual-journal-entry/manual-journal-entry-errors"
    )
    mockReadPdf.mockRejectedValue(
      new ManualJournalEntryError(
        "Manual journal PDF snapshot file is missing from Blob storage",
        ManualJournalEntryErrorCodes.PDF_MISSING,
        404
      )
    )

    const res = await pdfRoute(
      new NextRequest("http://localhost/api/finance/manual-journal-entries/entry-1/pdf"),
      context
    )

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({ code: "PDF_MISSING" })
  })
})
