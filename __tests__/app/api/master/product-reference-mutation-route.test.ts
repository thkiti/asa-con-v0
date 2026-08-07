import { NextRequest } from "next/server"
import { POST } from "@/app/api/master/product-reference/route"
import { PATCH } from "@/app/api/master/product-reference/[id]/route"
import { PATCH as PATCHProduct } from "@/app/api/master/products/[productId]/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/master", () => {
  const actual = jest.requireActual<typeof import("@/lib/master")>("@/lib/master")
  return {
    ...actual,
    listProductReference: jest.fn(),
    createReferenceStock: jest.fn(),
    patchReferenceStock: jest.fn(),
    patchProduct: jest.fn(),
  }
})

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {},
}))

import { getSession } from "@/lib/auth/session"
import { createReferenceStock, patchProduct } from "@/lib/master"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedCreate = createReferenceStock as jest.MockedFunction<typeof createReferenceStock>
const mockedPatchProduct = patchProduct as jest.MockedFunction<typeof patchProduct>

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
  references: [
    {
      id: "ref-1",
      hookGroup: "K",
      hookNo: 12,
      supplierCode: "K.144",
      productGroup: null,
      productCode: "5101001",
    },
  ],
  referenceCount: 1,
  deleted: false,
}

describe("POST /api/master/product-reference", () => {
  beforeEach(() => {
    mockedGetSession.mockReset()
    mockedCreate.mockReset()
  })

  it("creates reference for HO_ADMIN", async () => {
    mockedGetSession.mockResolvedValue(hoAdminSession)
    mockedCreate.mockResolvedValue(sampleItem)

    const req = new NextRequest("http://localhost/api/master/product-reference", {
      method: "POST",
      body: JSON.stringify({
        productId: "p1",
        hookGroup: "K",
        hookNo: 12,
        supplierCode: "K.144",
        productCode: "5101001",
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it("returns 403 for SH_STAFF", async () => {
    mockedGetSession.mockResolvedValue({ ...hoAdminSession, role: "SH_STAFF" })

    const req = new NextRequest("http://localhost/api/master/product-reference", {
      method: "POST",
      body: JSON.stringify({
        productId: "p1",
        hookGroup: "K",
        hookNo: 1,
        supplierCode: "K",
        productCode: "5101001",
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })
})

describe("PATCH /api/master/product-reference/[id]", () => {
  it("returns PRODUCT_ID_IMMUTABLE when productId sent", async () => {
    mockedGetSession.mockResolvedValue(hoAdminSession)

    const req = new NextRequest("http://localhost/api/master/product-reference/ref-1", {
      method: "PATCH",
      body: JSON.stringify({
        productId: "other",
        hookGroup: "K",
        hookNo: 1,
        supplierCode: "K",
        productCode: "5101001",
      }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: "ref-1" }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe("PRODUCT_ID_IMMUTABLE")
  })
})

describe("PATCH /api/master/products/[productId]", () => {
  it("soft-deletes product for HO_ADMIN", async () => {
    mockedGetSession.mockResolvedValue(hoAdminSession)
    mockedPatchProduct.mockResolvedValue({
      ...sampleItem,
      hasReference: false,
      deleted: true,
      hookGroup: "",
      hookNo: null,
      supplierCode: "",
      referenceProductCode: "",
      references: [],
      referenceCount: 0,
    })

    const req = new NextRequest("http://localhost/api/master/products/p1", {
      method: "PATCH",
      body: JSON.stringify({ deleted: true }),
    })
    const res = await PATCHProduct(req, { params: Promise.resolve({ productId: "p1" }) })
    expect(res.status).toBe(200)
    expect(mockedPatchProduct).toHaveBeenCalledWith(expect.anything(), "p1", { action: "delete" })
  })
})
