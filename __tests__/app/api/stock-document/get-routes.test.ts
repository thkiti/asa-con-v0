import { GET as GETList } from "@/app/api/stock-document/route"
import { GET as GETDetail } from "@/app/api/stock-document/[id]/route"
import { StockDocumentAuthError } from "@/lib/stock/document-read/document-access"
import { DocumentError, DocumentErrorCodes } from "@/lib/stock/document/document-errors"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/stock/document-read", () => ({
  requireStockDocumentSession: jest.requireActual("@/lib/stock/document-read")
    .requireStockDocumentSession,
  resolveListBranchId: jest.requireActual("@/lib/stock/document-read")
    .resolveListBranchId,
  listDocTypesForRole: jest.requireActual("@/lib/stock/document-read")
    .listDocTypesForRole,
  listStockDocuments: jest.fn(),
  getStockDocumentDetail: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import {
  getStockDocumentDetail,
  listStockDocuments,
} from "@/lib/stock/document-read"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedList = listStockDocuments as jest.MockedFunction<typeof listStockDocuments>
const mockedDetail = getStockDocumentDetail as jest.MockedFunction<
  typeof getStockDocumentDetail
>

const shopSession = {
  sessionId: "s1",
  userId: "staff-internal-1",
  role: "SH_STAFF" as const,
  staffId: "staff-1",
  name: "Shop",
  branchId: "branch-shop",
  branchCode: "SH001",
  branchName: "Shop Branch",
}

describe("GET /api/stock-document", () => {
  beforeEach(() => {
    mockedGetSession.mockReset()
    mockedList.mockReset()
  })

  it("returns list result", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedList.mockResolvedValue({ items: [], nextCursor: null, hasMore: false })

    const res = await GETList(
      new Request("http://localhost/api/stock-document?limit=10") as never
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      items: [],
      nextCursor: null,
      hasMore: false,
    })
    expect(mockedList).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ branchId: "branch-shop", limit: 10 })
    )
  })

  it("maps unauthenticated to 401", async () => {
    mockedGetSession.mockResolvedValue(null)

    const res = await GETList(
      new Request("http://localhost/api/stock-document") as never
    )

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({ code: "UNAUTHENTICATED" })
  })
})

describe("GET /api/stock-document/[id]", () => {
  beforeEach(() => {
    mockedGetSession.mockReset()
    mockedDetail.mockReset()
  })

  it("returns document detail", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedDetail.mockResolvedValue({
      id: "doc-1",
      refNo: "REF-1",
      docType: "PERFORMANCE",
      status: "DRAFT",
      date: "2026-01-01T00:00:00.000Z",
      periodMonth: null,
      branchId: "branch-shop",
      fromLocId: null,
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
      createdAt: "2026-01-01T00:00:00.000Z",
      lines: [],
    })

    const res = await GETDetail(
      new Request("http://localhost/api/stock-document/doc-1") as never,
      { params: Promise.resolve({ id: "doc-1" }) }
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ id: "doc-1" })
  })

  it("maps not found", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedDetail.mockRejectedValue(
      new DocumentError("Document not found", DocumentErrorCodes.DOCUMENT_NOT_FOUND, 404)
    )

    const res = await GETDetail(
      new Request("http://localhost/api/stock-document/missing") as never,
      { params: Promise.resolve({ id: "missing" }) }
    )

    expect(res.status).toBe(404)
  })

  it("maps branch access denied", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedDetail.mockRejectedValue(
      new StockDocumentAuthError("denied", "BRANCH_ACCESS_DENIED", 403)
    )

    const res = await GETDetail(
      new Request("http://localhost/api/stock-document/doc-1") as never,
      { params: Promise.resolve({ id: "doc-1" }) }
    )

    expect(res.status).toBe(403)
  })
})
