import { NextRequest } from "next/server"
import { POST } from "@/app/api/master/products/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/master", () => {
  const actual = jest.requireActual<typeof import("@/lib/master")>("@/lib/master")
  return {
    ...actual,
    createProductWithReference: jest.fn(),
  }
})

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { createProductWithReference } from "@/lib/master"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedCreate = createProductWithReference as jest.MockedFunction<
  typeof createProductWithReference
>

const hoAdminSession = {
  sessionId: "s1",
  userId: "u1",
  role: "HO_ADMIN" as const,
  staffId: "001",
  name: "Admin",
  branchId: "b1",
  branchCode: "HO999",
  branchName: "HO",
}

const sampleItem = {
  rowId: "ref-1",
  productId: "p1",
  productCode: "5101001",
  productName: "Product",
  productType: "TRACKED" as const,
  hookGroup: "K",
  hookNo: 12,
  supplierCode: "K.144",
  productGroup: null,
  referenceProductCode: "5101001",
  hasReference: true,
  deleted: false,
}

describe("POST /api/master/products", () => {
  beforeEach(() => {
    mockedGetSession.mockReset()
    mockedCreate.mockReset()
  })

  it("creates product with reference for HO_ADMIN", async () => {
    mockedGetSession.mockResolvedValue(hoAdminSession)
    mockedCreate.mockResolvedValue(sampleItem)

    const req = new NextRequest("http://localhost/api/master/products", {
      method: "POST",
      body: JSON.stringify({
        productCode: "5101001",
        name: "Product",
        productType: "TRACKED",
        hookGroup: "K",
        hookNo: 12,
        supplierCode: "K.144",
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = (await res.json()) as { item: typeof sampleItem }
    expect(body.item.productCode).toBe("5101001")
  })
})
