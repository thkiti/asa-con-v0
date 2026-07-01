jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    manualJournalEntry: {
      findFirst: jest.fn(),
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

jest.mock("@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-repair", () => ({
  deleteManualJournalEntryArchivedPdf: jest.fn(),
}))

import { NextRequest } from "next/server"
import { DELETE as deletePdfRoute } from "@/app/api/finance/manual-journal-entries/[id]/pdf/route"
import { getSession, requirePeriodAdminActor } from "@/lib/auth"
import { getManualJournalEntryById } from "@/lib/finance/manual-journal-entry/manual-journal-entry-read"
import { deleteManualJournalEntryArchivedPdf } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-repair"

const mockGet = getManualJournalEntryById as jest.Mock
const mockDelete = deleteManualJournalEntryArchivedPdf as jest.Mock
const context = { params: Promise.resolve({ id: "entry-1" }) }
const sessionAs = { documentEntityCode: "AS" as const }

describe("DELETE manual-journal-entries/[id]/pdf", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getSession as jest.Mock).mockResolvedValue(sessionAs)
    ;(requirePeriodAdminActor as jest.Mock).mockReturnValue({
      staffId: "staff-1",
      role: "HO_ADMIN",
    })
  })

  it("deletes archived PDF for HO_ADMIN", async () => {
    mockDelete.mockResolvedValue({ ok: true })
    mockGet.mockResolvedValue({
      id: "entry-1",
      pdfPath: null,
      pdfSnapshotReady: false,
    })

    const res = await deletePdfRoute(
      new NextRequest(
        "http://localhost/api/finance/manual-journal-entries/entry-1/pdf",
        { method: "DELETE" }
      ),
      context
    )

    expect(res.status).toBe(200)
    expect(mockDelete).toHaveBeenCalledWith("entry-1", "AS")
    await expect(res.json()).resolves.toEqual({
      entry: {
        id: "entry-1",
        pdfPath: null,
        pdfSnapshotReady: false,
      },
    })
  })

  it("forbids delete for HO_FINANCE", async () => {
    ;(requirePeriodAdminActor as jest.Mock).mockReturnValue({
      staffId: "staff-1",
      role: "HO_FINANCE",
    })

    const res = await deletePdfRoute(
      new NextRequest(
        "http://localhost/api/finance/manual-journal-entries/entry-1/pdf",
        { method: "DELETE" }
      ),
      context
    )

    expect(res.status).toBe(403)
    expect(mockDelete).not.toHaveBeenCalled()
  })
})
