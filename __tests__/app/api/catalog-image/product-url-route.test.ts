import { NextRequest } from "next/server"
import { GET } from "@/app/api/catalog-image/product-url/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/catalog-image/resolve-product-image-url", () => ({
  resolveCatalogProductImageUrl: jest.fn(),
}))

import { getSession } from "@/lib/auth/session"
import { resolveCatalogProductImageUrl } from "@/lib/catalog-image/resolve-product-image-url"

const getSessionMock = getSession as jest.Mock
const resolveMock = resolveCatalogProductImageUrl as jest.Mock

function getProductUrl(code: string) {
  return GET(
    new NextRequest(
      `http://localhost/api/catalog-image/product-url?code=${encodeURIComponent(code)}`
    )
  )
}

describe("GET /api/catalog-image/product-url", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getSessionMock.mockResolvedValue({
      staffId: "103",
      role: "HO_ADMIN",
    })
  })

  it("returns the same resolver URL as full-pos for a leading-zero product code", async () => {
    resolveMock.mockResolvedValue(
      "https://abc.public.blob.vercel-storage.com/products/0101001.jpg"
    )

    const res = await getProductUrl("0101001")
    expect(res.status).toBe(200)
    expect(resolveMock).toHaveBeenCalledWith("0101001")
    await expect(res.json()).resolves.toEqual({
      productCode: "0101001",
      imageUrl: "https://abc.public.blob.vercel-storage.com/products/0101001.jpg",
    })
  })

  it("returns null imageUrl when resolver finds no blob", async () => {
    resolveMock.mockResolvedValue(null)

    const res = await getProductUrl("9999999")
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      productCode: "9999999",
      imageUrl: null,
    })
  })

  it("requires session", async () => {
    getSessionMock.mockResolvedValue(null)

    const res = await getProductUrl("0101001")
    expect(res.status).toBe(401)
  })
})
