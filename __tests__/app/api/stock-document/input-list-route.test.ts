import { GET } from "@/app/api/stock-document/input-list/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/products/stock-input-list", () => ({
  buildStockInputList: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { buildStockInputList } from "@/lib/products/stock-input-list"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedBuild = buildStockInputList as jest.MockedFunction<typeof buildStockInputList>

const shopSession = {
  sessionId: "s1",
  role: "SH_STAFF" as const,
  staffId: "staff-1",
  name: "Shop",
  branchId: "branch-shop",
}

describe("GET /api/stock-document/input-list", () => {
  beforeEach(() => {
    mockedGetSession.mockReset()
    mockedBuild.mockReset()
  })

  it("returns assembled rows for authenticated session", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedBuild.mockResolvedValue([
      {
        rowKey: "K-1",
        source: "REFERENCE",
        referenceStockId: "ref-1",
        productId: "prod-1",
        productCode: "0101001",
        productName: "Key",
        hookGroup: "K",
        hookNo: 1,
        hookLabel: "K.1",
        supplierCode: "#K1",
        displayCode: "#K1",
        displayName: "Key",
        productGroup: "0101900",
        groupCode: "0101900",
        sortKey: "0101900|K|000001|#K1|0101001",
      },
    ])

    const res = await GET()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual([
      expect.objectContaining({ rowKey: "K-1", productId: "prod-1" }),
    ])
    expect(mockedBuild).toHaveBeenCalled()
  })

  it("maps unauthenticated to 401", async () => {
    mockedGetSession.mockResolvedValue(null)

    const res = await GET()
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({ code: "UNAUTHENTICATED" })
    expect(mockedBuild).not.toHaveBeenCalled()
  })

  it("maps assembler failures to 500", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedBuild.mockRejectedValue(new Error("db down"))

    const res = await GET()
    expect(res.status).toBe(500)
  })
})
