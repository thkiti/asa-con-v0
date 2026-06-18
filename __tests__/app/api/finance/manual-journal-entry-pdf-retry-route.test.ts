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

jest.mock("@/lib/finance/manual-journal-entry/manual-journal-entry-read", () => ({
  getManualJournalEntryById: jest.fn(),
}))

jest.mock("@/lib/finance/manual-journal-entry/manual-journal-entry-pdf", () => ({
  retryManualJournalEntryPdfAttach: jest.fn(),
}))

import { NextRequest } from "next/server"
import { POST as retryPdfRoute } from "@/app/api/finance/manual-journal-entries/[id]/pdf/retry/route"
import { getSession, requirePeriodAdminActor } from "@/lib/auth"
import { getManualJournalEntryById } from "@/lib/finance/manual-journal-entry/manual-journal-entry-read"
import { retryManualJournalEntryPdfAttach } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf"
import { prisma } from "@/lib/shared/prisma"

const mockFindUnique = prisma.manualJournalEntry.findUnique as jest.Mock
const mockGet = getManualJournalEntryById as jest.Mock
const mockRetryAttach = retryManualJournalEntryPdfAttach as jest.Mock
const context = { params: Promise.resolve({ id: "entry-1" }) }

const postedEntry = {
  id: "entry-1",
  status: "POSTED",
  pdfPath: null,
  pdfBlobUrl: null,
  pdfSnapshotReady: false,
}

describe("POST manual-journal-entries/[id]/pdf/retry", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getSession as jest.Mock).mockResolvedValue({})
    ;(requirePeriodAdminActor as jest.Mock).mockReturnValue({
      staffId: "staff-1",
    })
  })

  it("attaches PDF for posted entry without pdfPath", async () => {
    mockFindUnique.mockResolvedValue({ status: "POSTED", pdfPath: null })
    mockRetryAttach.mockResolvedValue({
      ok: true,
      pdfPath: "manual-journal/entry-1.pdf",
      pdfGeneratedAt: new Date("2026-06-18T10:00:00.000Z"),
    })
    mockGet.mockResolvedValue({
      ...postedEntry,
      pdfPath: "manual-journal/entry-1.pdf",
      pdfBlobUrl: "https://blob.example/manual-journal/entry-1.pdf",
      pdfSnapshotReady: true,
    })

    const res = await retryPdfRoute(
      new NextRequest(
        "http://localhost/api/finance/manual-journal-entries/entry-1/pdf/retry",
        { method: "POST" }
      ),
      context
    )

    expect(res.status).toBe(200)
    expect(mockRetryAttach).toHaveBeenCalledWith("entry-1")
    await expect(res.json()).resolves.toEqual({
      entry: {
        ...postedEntry,
        pdfPath: "manual-journal/entry-1.pdf",
        pdfBlobUrl: "https://blob.example/manual-journal/entry-1.pdf",
        pdfSnapshotReady: true,
      },
      pdfStatus: "ready",
    })
  })

  it("returns pending and pdfError when attach fails", async () => {
    mockFindUnique.mockResolvedValue({ status: "POSTED", pdfPath: null })
    mockRetryAttach.mockResolvedValue({
      ok: false,
      error: "Vercel Blob: This blob already exists",
    })
    mockGet.mockResolvedValue(postedEntry)

    const res = await retryPdfRoute(
      new NextRequest(
        "http://localhost/api/finance/manual-journal-entries/entry-1/pdf/retry",
        { method: "POST" }
      ),
      context
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      entry: postedEntry,
      pdfStatus: "pending",
      pdfError: "Vercel Blob: This blob already exists",
    })
  })

  it("skips attach when pdfPath already exists", async () => {
    mockFindUnique.mockResolvedValue({
      status: "POSTED",
      pdfPath: "manual-journal/entry-1.pdf",
    })
    mockGet.mockResolvedValue({
      ...postedEntry,
      pdfPath: "manual-journal/entry-1.pdf",
      pdfBlobUrl: "https://blob.example/manual-journal/entry-1.pdf",
      pdfSnapshotReady: true,
    })

    const res = await retryPdfRoute(
      new NextRequest(
        "http://localhost/api/finance/manual-journal-entries/entry-1/pdf/retry",
        { method: "POST" }
      ),
      context
    )

    expect(mockRetryAttach).not.toHaveBeenCalled()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ pdfStatus: "ready" })
  })
})
