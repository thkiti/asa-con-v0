import { NextRequest } from "next/server"
import { GET } from "@/app/api/operation/check-receipt/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/operations/check-receipt", () => ({
  listCheckReceiptRows: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { listCheckReceiptRows } from "@/lib/operations/check-receipt"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedList = listCheckReceiptRows as jest.MockedFunction<
  typeof listCheckReceiptRows
>

const hoOperationsSession = {
  sessionId: "s1",
  userId: "u1",
  role: "HO_OPERATIONS" as const,
  staffId: "001",
  name: "Ops",
  branchId: "b1",
  branchCode: "HO999",
  branchName: "HO",
}

describe("GET /api/operation/check-receipt", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns receipt list for valid query", async () => {
    mockedGetSession.mockResolvedValue(hoOperationsSession)
    mockedList.mockResolvedValue({
      branchId: "branch-1",
      branchCode: "SH001",
      year: 2026,
      month: 6,
      receipts: [],
    })

    const req = new NextRequest(
      "http://localhost/api/operation/check-receipt?branchId=branch-1&year=2026&month=6"
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.branchCode).toBe("SH001")
    expect(body.receipts).toEqual([])
  })

  it("returns 403 for SH_STAFF", async () => {
    mockedGetSession.mockResolvedValue({
      ...hoOperationsSession,
      role: "SH_STAFF",
    })

    const req = new NextRequest(
      "http://localhost/api/operation/check-receipt?branchId=branch-1&year=2026&month=6"
    )
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it("returns 400 when query params are missing", async () => {
    mockedGetSession.mockResolvedValue(hoOperationsSession)

    const req = new NextRequest("http://localhost/api/operation/check-receipt")
    const res = await GET(req)
    expect(res.status).toBe(400)
  })
})
