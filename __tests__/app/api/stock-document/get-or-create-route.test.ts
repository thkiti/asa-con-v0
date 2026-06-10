import { POST } from "@/app/api/stock-document/get-or-create/route"
import { getOrCreateStockCountDocument } from "@/lib/stock/document/get-or-create-stock-count"
import { getSession } from "@/lib/auth/session"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/stock/document/get-or-create-stock-count", () => ({
  getOrCreateStockCountDocument: jest.fn(),
}))

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedGetOrCreate = getOrCreateStockCountDocument as jest.MockedFunction<
  typeof getOrCreateStockCountDocument
>

describe("POST /api/stock-document/get-or-create", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetSession.mockResolvedValue({
      sessionId: "s1",
      userId: "u1",
      role: "SH_STAFF",
      staffId: "103",
      name: "Somsak",
      branchId: "branch-shop",
      branchCode: "SH001",
      branchName: "Chidlom",
    })
  })

  it("returns document id and refNo", async () => {
    mockedGetOrCreate.mockResolvedValue({
      id: "doc-adj-1",
      refNo: "ADJ-SH001-202606-0001",
    } as never)

    const res = await POST()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      id: "doc-adj-1",
      refNo: "ADJ-SH001-202606-0001",
    })
    expect(mockedGetOrCreate).toHaveBeenCalledWith({
      branchId: "branch-shop",
      staffId: "103",
    })
  })
})
