jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

jest.mock("@/lib/auth", () => {
  const actual = jest.requireActual("@/lib/auth")
  return {
    ...actual,
    getSession: jest.fn(),
    requirePeriodAdminActor: jest.fn(),
  }
})

jest.mock("@/lib/finance/manual-journal-entry/manual-journal-entry-save", () => ({
  createManualJournalEntryDraft: jest.fn(),
  updateManualJournalEntryDraft: jest.fn(),
}))

jest.mock("@/lib/finance/manual-journal-entry/manual-journal-entry-read", () => ({
  listManualJournalEntries: jest.fn(),
  getManualJournalEntryById: jest.fn(),
}))

jest.mock("@/lib/finance/manual-journal-entry/manual-journal-entry-workflow", () => ({
  submitManualJournalEntry: jest.fn(),
  confirmManualJournalEntry: jest.fn(),
  cancelManualJournalEntry: jest.fn(),
  deleteDraftManualJournalEntry: jest.fn(),
}))

jest.mock("@/lib/finance/manual-journal-entry/manual-journal-entry-post", () => ({
  postManualJournalEntry: jest.fn(),
}))

jest.mock("@/lib/finance/manual-journal-entry/manual-journal-entry-pdf", () => ({
  attachManualJournalEntryPdfFromSnapshot: jest.fn(),
}))

import fs from "fs"
import path from "path"
import { NextRequest } from "next/server"
import { GET as listRoute, POST as createRoute } from "@/app/api/finance/manual-journal-entries/route"
import {
  GET as detailRoute,
  PATCH as patchRoute,
  DELETE as deleteRoute,
} from "@/app/api/finance/manual-journal-entries/[id]/route"
import { POST as submitRoute } from "@/app/api/finance/manual-journal-entries/[id]/submit/route"
import { POST as confirmRoute } from "@/app/api/finance/manual-journal-entries/[id]/confirm/route"
import { POST as cancelRoute } from "@/app/api/finance/manual-journal-entries/[id]/cancel/route"
import { POST as postRoute } from "@/app/api/finance/manual-journal-entries/[id]/post/route"
import { getSession, requirePeriodAdminActor } from "@/lib/auth"
import {
  createManualJournalEntryDraft,
  updateManualJournalEntryDraft,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-save"
import {
  getManualJournalEntryById,
  listManualJournalEntries,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-read"
import { postManualJournalEntry } from "@/lib/finance/manual-journal-entry/manual-journal-entry-post"
import { attachManualJournalEntryPdfFromSnapshot } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf"
import {
  cancelManualJournalEntry,
  confirmManualJournalEntry,
  deleteDraftManualJournalEntry,
  submitManualJournalEntry,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-workflow"
import {
  ManualJournalEntryError,
  ManualJournalEntryErrorCodes,
  ManualJournalEntryPolicyError,
} from "@/lib/finance/manual-journal-entry/manual-journal-entry-errors"
import { prisma } from "@/lib/shared/prisma"

const mockList = listManualJournalEntries as jest.Mock
const mockGet = getManualJournalEntryById as jest.Mock
const mockCreate = createManualJournalEntryDraft as jest.Mock
const mockUpdate = updateManualJournalEntryDraft as jest.Mock
const mockDelete = deleteDraftManualJournalEntry as jest.Mock
const mockSubmit = submitManualJournalEntry as jest.Mock
const mockConfirm = confirmManualJournalEntry as jest.Mock
const mockCancel = cancelManualJournalEntry as jest.Mock
const mockPost = postManualJournalEntry as jest.Mock
const mockAttachPdf = attachManualJournalEntryPdfFromSnapshot as jest.Mock

const actor = { staffId: "staff-1", name: "Admin", role: "HO_FINANCE" }

const sampleEntry = {
  id: "entry-1",
  entryNo: "MAJ-2620001",
  entryType: "MANUAL" as const,
  status: "DRAFT" as const,
  branchId: "branch-1",
  legalEntityCode: "AS",
  entryDate: "2026-06-14T12:00:00.000Z",
  description: "Test entry",
  refNo: null,
  createdByStaffId: "staff-1",
  submittedAt: null,
  submittedByStaffId: null,
  confirmedAt: null,
  confirmedByStaffId: null,
  postedAt: null,
  postedByStaffId: null,
  cancelledAt: null,
  cancelledByStaffId: null,
  cancelReason: null,
  postedVoucherId: null,
  postedJournalEntryId: null,
  reversalJournalEntryId: null,
  pdfPath: null,
  pdfBlobUrl: null,
  pdfGeneratedAt: null,
  pdfSnapshotReady: false,
  createdAt: "2026-06-14T12:00:00.000Z",
  updatedAt: "2026-06-14T12:00:00.000Z",
  lines: [
    {
      id: "line-1",
      lineNo: 1,
      glAccountId: "acc-1100",
      accountCode: "1100",
      accountName: "Cash",
      debit: "100.00",
      credit: "0.00",
      memo: null,
    },
  ],
}

const context = { params: Promise.resolve({ id: "entry-1" }) }

describe("manual journal entries API routes", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getSession as jest.Mock).mockResolvedValue({})
    ;(requirePeriodAdminActor as jest.Mock).mockReturnValue(actor)
    mockGet.mockResolvedValue(sampleEntry)
  })

  describe("GET list", () => {
    it("returns list result", async () => {
      mockList.mockResolvedValue({
        entries: [{ ...sampleEntry, lineCount: 1, lines: undefined }],
        total: 1,
      })

      const req = new NextRequest(
        "http://localhost/api/finance/manual-journal-entries?legalEntityCode=AS&status=DRAFT"
      )
      const res = await listRoute(req)

      expect(res.status).toBe(200)
      expect(mockList).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({
          legalEntityCode: "AS",
          status: "DRAFT",
        })
      )
      await expect(res.json()).resolves.toEqual({
        entries: [{ ...sampleEntry, lineCount: 1, lines: undefined }],
        total: 1,
      })
    })
  })

  describe("POST create draft", () => {
    it("creates draft and returns detail", async () => {
      mockCreate.mockResolvedValue({ id: "entry-1" })

      const req = new NextRequest("http://localhost/api/finance/manual-journal-entries", {
        method: "POST",
        body: JSON.stringify({
          branchId: "branch-1",
          legalEntityCode: "AS",
          entryDate: "2026-06-14",
          entryType: "MANUAL",
          description: "Test entry",
          lines: [{ accountCode: "1100", debit: "100", credit: "0" }],
        }),
      })

      const res = await createRoute(req)
      expect(res.status).toBe(200)
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          branchId: "branch-1",
          legalEntityCode: "AS",
          entryType: "MANUAL",
          createdByStaffId: "staff-1",
        })
      )
      await expect(res.json()).resolves.toEqual({ entry: sampleEntry })
    })

    it("returns 400 when branchId missing", async () => {
      const req = new NextRequest("http://localhost/api/finance/manual-journal-entries", {
        method: "POST",
        body: JSON.stringify({ legalEntityCode: "AS", entryDate: "2026-06-14" }),
      })
      const res = await createRoute(req)
      expect(res.status).toBe(400)
      await expect(res.json()).resolves.toMatchObject({
        code: "VALIDATION_ERROR",
      })
    })
  })

  describe("GET detail", () => {
    it("returns entry detail", async () => {
      const res = await detailRoute(
        new NextRequest("http://localhost/api/finance/manual-journal-entries/entry-1"),
        context
      )
      expect(res.status).toBe(200)
      expect(mockGet).toHaveBeenCalledWith(prisma, "entry-1")
      await expect(res.json()).resolves.toEqual({ entry: sampleEntry })
    })

    it("maps ENTRY_NOT_FOUND to 404", async () => {
      mockGet.mockRejectedValue(
        new ManualJournalEntryError(
          "not found",
          ManualJournalEntryErrorCodes.ENTRY_NOT_FOUND,
          404
        )
      )
      const res = await detailRoute(
        new NextRequest("http://localhost/api/finance/manual-journal-entries/missing"),
        { params: Promise.resolve({ id: "missing" }) }
      )
      expect(res.status).toBe(404)
      await expect(res.json()).resolves.toEqual({
        error: "not found",
        code: "ENTRY_NOT_FOUND",
      })
    })
  })

  describe("PATCH draft", () => {
    it("updates draft and returns detail", async () => {
      mockUpdate.mockResolvedValue({ id: "entry-1" })

      const req = new NextRequest("http://localhost/api/finance/manual-journal-entries/entry-1", {
        method: "PATCH",
        body: JSON.stringify({
          description: "Updated",
          lines: [{ accountCode: "1100", debit: "200", credit: "0" }],
        }),
      })

      const res = await patchRoute(req, context)
      expect(res.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          entryId: "entry-1",
          description: "Updated",
        })
      )
      await expect(res.json()).resolves.toEqual({ entry: sampleEntry })
    })
  })

  describe("DELETE draft", () => {
    it("deletes draft", async () => {
      mockDelete.mockResolvedValue(undefined)
      const res = await deleteRoute(
        new NextRequest("http://localhost/api/finance/manual-journal-entries/entry-1", {
          method: "DELETE",
        }),
        context
      )
      expect(res.status).toBe(200)
      expect(mockDelete).toHaveBeenCalledWith({ entryId: "entry-1" })
      await expect(res.json()).resolves.toEqual({ deleted: true })
    })
  })

  describe("workflow routes", () => {
    it("POST submit", async () => {
      mockSubmit.mockResolvedValue(undefined)
      const res = await submitRoute(
        new NextRequest("http://localhost/api/finance/manual-journal-entries/entry-1/submit", {
          method: "POST",
        }),
        context
      )
      expect(res.status).toBe(200)
      expect(mockSubmit).toHaveBeenCalledWith({
        entryId: "entry-1",
        submittedByStaffId: "staff-1",
      })
      await expect(res.json()).resolves.toEqual({ entry: sampleEntry })
    })

    it("POST confirm", async () => {
      mockConfirm.mockResolvedValue(undefined)
      const res = await confirmRoute(
        new NextRequest("http://localhost/api/finance/manual-journal-entries/entry-1/confirm", {
          method: "POST",
        }),
        context
      )
      expect(res.status).toBe(200)
      expect(mockConfirm).toHaveBeenCalledWith({
        entryId: "entry-1",
        confirmedByStaffId: "staff-1",
      })
    })

    it("POST cancel with reason", async () => {
      mockCancel.mockResolvedValue(undefined)
      const req = new NextRequest(
        "http://localhost/api/finance/manual-journal-entries/entry-1/cancel",
        {
          method: "POST",
          body: JSON.stringify({ cancelReason: "Mistake" }),
        }
      )
      const res = await cancelRoute(req, context)
      expect(res.status).toBe(200)
      expect(mockCancel).toHaveBeenCalledWith({
        entryId: "entry-1",
        cancelledByStaffId: "staff-1",
        cancelReason: "Mistake",
      })
    })

    it("POST post", async () => {
      mockPost.mockResolvedValue({
        entry: { ...sampleEntry, status: "POSTED", pdfPath: null, pdfSnapshotReady: false },
        pdfSnapshot: { entryId: "entry-1" },
      })
      mockAttachPdf.mockResolvedValue({ ok: true })
      mockGet.mockResolvedValue({
        ...sampleEntry,
        status: "POSTED",
        pdfPath: "manual-journal/entry-1.pdf",
        pdfBlobUrl: null,
        pdfSnapshotReady: true,
      })
      const res = await postRoute(
        new NextRequest("http://localhost/api/finance/manual-journal-entries/entry-1/post", {
          method: "POST",
        }),
        context
      )
      expect(res.status).toBe(200)
      expect(mockPost).toHaveBeenCalledWith({
        entryId: "entry-1",
        postedByStaffId: "staff-1",
      })
      expect(mockAttachPdf).toHaveBeenCalled()
      await expect(res.json()).resolves.toEqual({
        entry: {
          ...sampleEntry,
          status: "POSTED",
          pdfPath: "manual-journal/entry-1.pdf",
          pdfBlobUrl: null,
          pdfSnapshotReady: true,
        },
        pdfStatus: "ready",
      })
    })

    it("POST post surfaces pdfError when attach fails", async () => {
      mockPost.mockResolvedValue({
        entry: { ...sampleEntry, status: "POSTED", pdfPath: null, pdfSnapshotReady: false },
        pdfSnapshot: { entryId: "entry-1" },
      })
      mockAttachPdf.mockResolvedValue({
        ok: false,
        error: "Vercel Blob: This blob already exists",
      })
      mockGet.mockResolvedValue({
        ...sampleEntry,
        status: "POSTED",
        pdfPath: null,
        pdfBlobUrl: null,
        pdfSnapshotReady: false,
      })
      const res = await postRoute(
        new NextRequest("http://localhost/api/finance/manual-journal-entries/entry-1/post", {
          method: "POST",
        }),
        context
      )
      expect(res.status).toBe(200)
      await expect(res.json()).resolves.toEqual({
        entry: {
          ...sampleEntry,
          status: "POSTED",
          pdfPath: null,
          pdfBlobUrl: null,
          pdfSnapshotReady: false,
        },
        pdfStatus: "pending",
        pdfError: "Vercel Blob: This blob already exists",
      })
    })
  })

  describe("error mapping", () => {
    it("maps INVALID_TRANSITION to 409 on submit", async () => {
      mockSubmit.mockRejectedValue(new ManualJournalEntryPolicyError("cannot submit"))
      const res = await submitRoute(
        new NextRequest("http://localhost/api/finance/manual-journal-entries/entry-1/submit", {
          method: "POST",
        }),
        context
      )
      expect(res.status).toBe(409)
      await expect(res.json()).resolves.toEqual({
        error: "cannot submit",
        code: "INVALID_TRANSITION",
      })
    })

    it("maps UNBALANCED_ENTRY to 400 on submit", async () => {
      mockSubmit.mockRejectedValue(
        new ManualJournalEntryError(
          "unbalanced",
          ManualJournalEntryErrorCodes.UNBALANCED_ENTRY
        )
      )
      const res = await submitRoute(
        new NextRequest("http://localhost/api/finance/manual-journal-entries/entry-1/submit", {
          method: "POST",
        }),
        context
      )
      expect(res.status).toBe(400)
      await expect(res.json()).resolves.toEqual({
        error: "unbalanced",
        code: "UNBALANCED_ENTRY",
      })
    })

    it("maps auth errors to 403", async () => {
      const { PeriodAdminAuthError } = await import("@/lib/auth")
      ;(requirePeriodAdminActor as jest.Mock).mockImplementation(() => {
        throw new PeriodAdminAuthError("forbidden", "FORBIDDEN", 403)
      })
      const res = await listRoute(
        new NextRequest("http://localhost/api/finance/manual-journal-entries")
      )
      expect(res.status).toBe(403)
      await expect(res.json()).resolves.toMatchObject({ code: "FORBIDDEN" })
    })
  })
})

describe("16B instant-post journal-entries API unchanged", () => {
  const journalEntriesRoute = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "app",
    "api",
    "finance",
    "journal-entries",
    "route.ts"
  )

  it("still uses postManualJournalVoucher for POST", () => {
    const source = fs.readFileSync(journalEntriesRoute, "utf8")
    expect(source).toContain("postManualJournalVoucher")
    expect(source).not.toContain("manual-journal-entries")
    expect(source).not.toContain("createManualJournalEntryDraft")
  })

  it("POST still requires idempotencyKey", () => {
    const source = fs.readFileSync(journalEntriesRoute, "utf8")
    expect(source).toContain("idempotencyKey")
  })
})
