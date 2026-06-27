import { NextRequest } from "next/server"
import { GET } from "@/app/api/pos/document-lookup/running-numbers/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/pos/document-lookup-running-numbers", () => ({
  listDocumentLookupRunningNumbers: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { listDocumentLookupRunningNumbers } from "@/lib/pos/document-lookup-running-numbers"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedList = listDocumentLookupRunningNumbers as jest.MockedFunction<
  typeof listDocumentLookupRunningNumbers
>

const shopSession = {
  sessionId: "s1",
  userId: "u1",
  role: "SH_STAFF" as const,
  staffId: "staff-1",
  name: "Shop",
  branchId: "branch-shop",
  branchCode: "SH001",
  branchName: "Shop Branch",
  documentEntityCode: "ASAS" as const,
}

describe("GET /api/pos/document-lookup/running-numbers", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetSession.mockResolvedValue(shopSession)
  })

  it("returns refund running numbers for enabled doc type", async () => {
    mockedList.mockResolvedValue(["0001", "0008"])

    const res = await GET(
      new NextRequest(
        "http://localhost/api/pos/document-lookup/running-numbers?docType=refund&year=2026&month=6"
      )
    )

    expect(res.status).toBe(200)
    expect(mockedList).toHaveBeenCalledWith(expect.anything(), {
      branchId: "branch-shop",
      docType: "refund",
      year: 2026,
      month: 6,
    })
    await expect(res.json()).resolves.toEqual({ runningNumbers: ["0001", "0008"] })
  })

  it("returns empty list for receipt doc type without querying", async () => {
    const res = await GET(
      new NextRequest(
        "http://localhost/api/pos/document-lookup/running-numbers?docType=receipt&year=2026&month=6"
      )
    )

    expect(res.status).toBe(200)
    expect(mockedList).not.toHaveBeenCalled()
    await expect(res.json()).resolves.toEqual({ runningNumbers: [] })
  })
})
