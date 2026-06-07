import { POST } from "@/app/api/operation/catalog-image/upload/route"

jest.mock("@/lib/auth/session", () => ({
  getSession: jest.fn(),
}))

jest.mock("@/lib/shared/prisma", () => ({
  prisma: {
    product: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock("@/lib/catalog-image/paths", () => ({
  resolveFinalWorkFilePath: jest.fn(),
  resolveFinalProductImagePath: jest.fn(),
}))

jest.mock("@/lib/catalog-image/cloud-storage", () => ({
  checkCatalogImageExists: jest.fn().mockResolvedValue(false),
  getCatalogProductCloudPath: jest.fn((code: string) => `catalog-products/${code}.png`),
  uploadCatalogProductImage: jest.fn(),
}))

jest.mock("fs/promises", () => ({
  access: jest.fn().mockResolvedValue(undefined),
}))

import { getSession } from "@/lib/auth/session"
import { uploadCatalogProductImage } from "@/lib/catalog-image/cloud-storage"
import {
  resolveFinalProductImagePath,
  resolveFinalWorkFilePath,
} from "@/lib/catalog-image/paths"
import { prisma } from "@/lib/shared/prisma"

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedFindUnique = prisma.product.findUnique as jest.Mock
const mockedResolveFinalWork = resolveFinalWorkFilePath as jest.MockedFunction<
  typeof resolveFinalWorkFilePath
>
const mockedResolveFinalProduct = resolveFinalProductImagePath as jest.MockedFunction<
  typeof resolveFinalProductImagePath
>
const mockedUpload = uploadCatalogProductImage as jest.MockedFunction<
  typeof uploadCatalogProductImage
>

const hoSession = {
  sessionId: "s1",
  userId: "u1",
  role: "HO_OPERATIONS" as const,
  staffId: "staff-1",
  name: "Ops",
  branchId: "branch-1",
  branchCode: "HO",
  branchName: "Head Office",
}

const finalFilePath = "/tmp/catalog-work/final/0101015.png"

describe("POST /api/operation/catalog-image/upload", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetSession.mockResolvedValue(hoSession)
    mockedResolveFinalWork.mockReturnValue(finalFilePath)
    mockedResolveFinalProduct.mockReturnValue(finalFilePath)
  })

  it("rejects productCode not found", async () => {
    mockedFindUnique.mockResolvedValue(null)

    const res = await POST(
      new Request("http://localhost/api/operation/catalog-image/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode: "0101015",
          localFilePath: finalFilePath,
        }),
      })
    )

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({ code: "PRODUCT_NOT_FOUND" })
    expect(mockedUpload).not.toHaveBeenCalled()
    expect(prisma.product.create).not.toHaveBeenCalled()
  })

  it("rejects temp slot file outside final folder", async () => {
    mockedFindUnique.mockResolvedValue({ id: "prod-1" })
    const { CatalogImageError } = await import("@/lib/catalog-image/errors")
    mockedResolveFinalWork.mockImplementation(() => {
      throw new CatalogImageError("Path traversal", "PATH_TRAVERSAL", 400)
    })

    const res = await POST(
      new Request("http://localhost/api/operation/catalog-image/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode: "0101015",
          localFilePath: "/tmp/catalog-work/batch/page-1/slot-1.png",
        }),
      })
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ code: "PATH_TRAVERSAL" })
    expect(mockedUpload).not.toHaveBeenCalled()
  })

  it("uploads to catalog-products/{productCode}.png from final folder", async () => {
    mockedFindUnique.mockResolvedValue({ id: "prod-1" })
    mockedUpload.mockResolvedValue({
      cloudPath: "catalog-products/0101015.png",
      publicUrl: null,
    })

    const res = await POST(
      new Request("http://localhost/api/operation/catalog-image/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode: "0101015",
          localFilePath: finalFilePath,
        }),
      })
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      cloudPath: "catalog-products/0101015.png",
      publicUrl: null,
    })
    expect(mockedUpload).toHaveBeenCalledWith({
      productCode: "0101015",
      localFilePath: finalFilePath,
      contentType: "image/png",
    })
  })

  it("returns CATALOG_IMAGE_STORAGE_NOT_CONFIGURED from cloud stub", async () => {
    mockedFindUnique.mockResolvedValue({ id: "prod-1" })
    const { CatalogImageError } = await import("@/lib/catalog-image/errors")
    mockedUpload.mockRejectedValue(
      new CatalogImageError(
        "Catalog image cloud storage is not configured",
        "CATALOG_IMAGE_STORAGE_NOT_CONFIGURED",
        503
      )
    )

    const res = await POST(
      new Request("http://localhost/api/operation/catalog-image/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode: "0101015",
          localFilePath: finalFilePath,
        }),
      })
    )

    expect(res.status).toBe(503)
    await expect(res.json()).resolves.toMatchObject({
      code: "CATALOG_IMAGE_STORAGE_NOT_CONFIGURED",
    })
  })
})
