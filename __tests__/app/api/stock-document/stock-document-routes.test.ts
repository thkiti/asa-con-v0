import { DELETE } from "@/app/api/stock-document/[id]/route"
import { POST as POSTCancel } from "@/app/api/stock-document/[id]/cancel/route"
import { POST as POSTConfirm } from "@/app/api/stock-document/[id]/confirm/route"
import { POST as POSTSubmit } from "@/app/api/stock-document/[id]/submit/route"
import { POST as POSTSave } from "@/app/api/stock-document/route"
import { DocumentError, DocumentErrorCodes } from "@/lib/stock/document/document-errors"
import { saveDocument } from "@/lib/stock/document/document-save"
import {
  cancelDocument,
  confirmDocument,
  deleteDraftDocument,
  submitDocument,
} from "@/lib/stock/document/document-workflow"
import type { StockDocumentWithLines } from "@/lib/stock/posting-types"

jest.mock("@/lib/stock/document/document-save", () => ({
  saveDocument: jest.fn(),
}))

jest.mock("@/lib/stock/document/document-workflow", () => ({
  submitDocument: jest.fn(),
  confirmDocument: jest.fn(),
  cancelDocument: jest.fn(),
  deleteDraftDocument: jest.fn(),
}))

const mockedSave = saveDocument as jest.MockedFunction<typeof saveDocument>
const mockedSubmit = submitDocument as jest.MockedFunction<typeof submitDocument>
const mockedConfirm = confirmDocument as jest.MockedFunction<typeof confirmDocument>
const mockedCancel = cancelDocument as jest.MockedFunction<typeof cancelDocument>
const mockedDelete = deleteDraftDocument as jest.MockedFunction<typeof deleteDraftDocument>

const sampleDoc = {
  id: "doc-1",
  refNo: "REF-1",
  docType: "PERFORMANCE",
  status: "DRAFT",
  date: new Date("2026-01-15"),
  branchId: "branch-1",
  periodMonth: "2026-01",
  fromLocId: "branch-1",
  toLocId: null,
  submittedAt: null,
  confirmedAt: null,
  postedAt: null,
  createdByStaffId: null,
  confirmedByStaffId: null,
  postedByStaffId: null,
  cancelledAt: null,
  cancelledByStaffId: null,
  cancelReason: null,
  createdAt: new Date("2026-01-01"),
  lines: [
    {
      id: "l1",
      documentId: "doc-1",
      productId: "p1",
      qty: 2,
      endingQty: null,
      reviewPostingDelta: null,
    },
  ],
} satisfies StockDocumentWithLines

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as never
}

describe("POST /api/stock-document", () => {
  beforeEach(() => mockedSave.mockReset())

  it("returns saved document on success", async () => {
    mockedSave.mockResolvedValue(sampleDoc)

    const res = await POSTSave(
      jsonRequest("http://localhost/api/stock-document", "POST", {
        docType: "PERFORMANCE",
        date: "2026-02-01",
        branchId: "branch-1",
        fromLocId: "branch-1",
        lines: [{ productId: "p1", qty: 2 }],
      })
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ id: "doc-1", status: "DRAFT" })
    expect(mockedSave).toHaveBeenCalled()
  })

  it("maps DOCUMENT_NOT_FOUND", async () => {
    mockedSave.mockRejectedValue(
      new DocumentError("Document not found", DocumentErrorCodes.DOCUMENT_NOT_FOUND, 404)
    )

    const res = await POSTSave(
      jsonRequest("http://localhost/api/stock-document", "POST", {
        docType: "PERFORMANCE",
        date: "2026-02-01",
        branchId: "branch-1",
        id: "missing",
        lines: [{ productId: "p1", qty: 1 }],
      })
    )

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({
      error: "Document not found",
      code: DocumentErrorCodes.DOCUMENT_NOT_FOUND,
    })
  })

  it("maps DOCUMENT_IMMUTABLE", async () => {
    mockedSave.mockRejectedValue(
      new DocumentError(
        "Document in status POSTED cannot be edited",
        DocumentErrorCodes.DOCUMENT_IMMUTABLE
      )
    )

    const res = await POSTSave(
      jsonRequest("http://localhost/api/stock-document", "POST", {
        docType: "PERFORMANCE",
        date: "2026-02-01",
        branchId: "branch-1",
        id: "doc-1",
        lines: [{ productId: "p1", qty: 1 }],
      })
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      code: DocumentErrorCodes.DOCUMENT_IMMUTABLE,
    })
  })
})

describe("POST /api/stock-document/[id]/submit", () => {
  beforeEach(() => mockedSubmit.mockReset())

  it("returns submitted document on success", async () => {
    mockedSubmit.mockResolvedValue({ ...sampleDoc, status: "SUBMITTED" })

    const res = await POSTSubmit(
      jsonRequest("http://localhost/api/stock-document/doc-1/submit", "POST"),
      { params: Promise.resolve({ id: "doc-1" }) }
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ status: "SUBMITTED" })
  })

  it("maps EMPTY_DOCUMENT", async () => {
    mockedSubmit.mockRejectedValue(
      new DocumentError(
        "Document must have at least one line",
        DocumentErrorCodes.EMPTY_DOCUMENT
      )
    )

    const res = await POSTSubmit(
      jsonRequest("http://localhost/api/stock-document/doc-1/submit", "POST"),
      { params: Promise.resolve({ id: "doc-1" }) }
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      code: DocumentErrorCodes.EMPTY_DOCUMENT,
    })
  })

  it("maps INVALID_DOCUMENT_STATUS", async () => {
    mockedSubmit.mockRejectedValue(
      new DocumentError(
        "Only DRAFT documents may be submitted",
        DocumentErrorCodes.INVALID_DOCUMENT_STATUS
      )
    )

    const res = await POSTSubmit(
      jsonRequest("http://localhost/api/stock-document/doc-1/submit", "POST"),
      { params: Promise.resolve({ id: "doc-1" }) }
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      code: DocumentErrorCodes.INVALID_DOCUMENT_STATUS,
    })
  })
})

describe("POST /api/stock-document/[id]/confirm", () => {
  beforeEach(() => mockedConfirm.mockReset())

  it("returns confirmed document on success", async () => {
    mockedConfirm.mockResolvedValue({ ...sampleDoc, status: "CONFIRMED" })

    const res = await POSTConfirm(
      jsonRequest("http://localhost/api/stock-document/doc-1/confirm", "POST", {
        staffId: "staff-1",
      }),
      { params: Promise.resolve({ id: "doc-1" }) }
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ status: "CONFIRMED" })
    expect(mockedConfirm).toHaveBeenCalledWith({
      documentId: "doc-1",
      confirmedByStaffId: "staff-1",
    })
  })

  it("maps invalid transition to INVALID_DOCUMENT_STATUS", async () => {
    mockedConfirm.mockRejectedValue(
      new DocumentError(
        "Only SUBMITTED documents may be confirmed",
        DocumentErrorCodes.INVALID_DOCUMENT_STATUS
      )
    )

    const res = await POSTConfirm(
      jsonRequest("http://localhost/api/stock-document/doc-1/confirm", "POST", {
        confirmedByStaffId: "staff-1",
      }),
      { params: Promise.resolve({ id: "doc-1" }) }
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      code: DocumentErrorCodes.INVALID_DOCUMENT_STATUS,
    })
  })
})

describe("POST /api/stock-document/[id]/cancel", () => {
  beforeEach(() => mockedCancel.mockReset())

  it("returns cancelled document on success", async () => {
    mockedCancel.mockResolvedValue({ ...sampleDoc, status: "CANCELLED" })

    const res = await POSTCancel(
      jsonRequest("http://localhost/api/stock-document/doc-1/cancel", "POST", {
        staffId: "staff-cancel",
      }),
      { params: Promise.resolve({ id: "doc-1" }) }
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ status: "CANCELLED" })
  })

  it("maps posted document cancel to DOCUMENT_IMMUTABLE", async () => {
    mockedCancel.mockRejectedValue(
      new DocumentError(
        "Cannot cancel document in status POSTED",
        "IMMUTABLE_DOCUMENT",
        400
      )
    )

    const res = await POSTCancel(
      jsonRequest("http://localhost/api/stock-document/doc-1/cancel", "POST", {
        cancelledByStaffId: "staff-1",
      }),
      { params: Promise.resolve({ id: "doc-1" }) }
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "Cannot cancel document in status POSTED",
      code: DocumentErrorCodes.DOCUMENT_IMMUTABLE,
    })
  })
})

describe("DELETE /api/stock-document/[id]", () => {
  beforeEach(() => mockedDelete.mockReset())

  it("returns deleted on success", async () => {
    mockedDelete.mockResolvedValue(undefined)

    const res = await DELETE(
      jsonRequest("http://localhost/api/stock-document/doc-1", "DELETE"),
      { params: Promise.resolve({ id: "doc-1" }) }
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ deleted: true })
    expect(mockedDelete).toHaveBeenCalledWith({ documentId: "doc-1" })
  })

  it("maps submitted delete to DOCUMENT_IMMUTABLE", async () => {
    mockedDelete.mockRejectedValue(
      new DocumentError(
        "Only DRAFT documents may be deleted",
        "IMMUTABLE_DOCUMENT",
        400
      )
    )

    const res = await DELETE(
      jsonRequest("http://localhost/api/stock-document/doc-1", "DELETE"),
      { params: Promise.resolve({ id: "doc-1" }) }
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "Only DRAFT documents may be deleted",
      code: DocumentErrorCodes.DOCUMENT_IMMUTABLE,
    })
  })
})
