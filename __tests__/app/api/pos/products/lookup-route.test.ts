import { NextRequest } from "next/server"
import { GET } from "@/app/api/pos/products/lookup/route"
import { PosLookupError } from "@/lib/pos/pos-errors"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/pos/product-search", () => ({
  lookupPosProductByCode: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { lookupPosProductByCode } from "@/lib/pos/product-search"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedLookup = lookupPosProductByCode as jest.MockedFunction<
  typeof lookupPosProductByCode
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
}

function getLookup(code: string) {
  return GET(
    new NextRequest(
      `http://localhost/api/pos/products/lookup?code=${encodeURIComponent(code)}`
    )
  )
}

describe("GET /api/pos/products/lookup", () => {
  beforeEach(() => {
    mockedGetSession.mockReset()
    mockedLookup.mockReset()
  })

  it("returns product from lookup service", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedLookup.mockResolvedValue({
      productId: "p1",
      code: "0101001",
      name: "Widget",
      unitPrice: "50.00",
      priceSource: "SELLING",
    })

    const res = await getLookup("1010015")
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      product: {
        productId: "p1",
        code: "0101001",
        name: "Widget",
        unitPrice: "50.00",
        priceSource: "SELLING",
      },
    })
  })

  it("returns 401 when unauthenticated", async () => {
    mockedGetSession.mockResolvedValue(null)
    const res = await getLookup("1010015")
    expect(res.status).toBe(401)
  })

  it("maps PosLookupError to structured JSON", async () => {
    mockedGetSession.mockResolvedValue(shopSession)
    mockedLookup.mockRejectedValue(
      new PosLookupError("No active selling price", "NO_ACTIVE_PRICE", 400)
    )

    const res = await getLookup("1010015")
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "No active selling price",
      code: "NO_ACTIVE_PRICE",
    })
  })
})
