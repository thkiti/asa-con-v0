import path from "path"
import {
  getProductCloudPath,
  listExistingProductCloudImageBlobs,
  listExistingProductCloudImages,
  uploadProductImageToBlob,
  uploadProductImagesToBlob,
} from "@/lib/catalog-image/vercel-blob"

const mockList = jest.fn()
const mockPut = jest.fn()
const mockReadFile = jest.fn()
const mockReaddir = jest.fn()
const mockFindExisting = jest.fn()

jest.mock("@vercel/blob", () => ({
  list: (...args: unknown[]) => mockList(...args),
  put: (...args: unknown[]) => mockPut(...args),
}))

jest.mock("fs/promises", () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
  readdir: (...args: unknown[]) => mockReaddir(...args),
}))

jest.mock("@/lib/catalog-image/product-image-files", () => {
  const actual = jest.requireActual<
    typeof import("@/lib/catalog-image/product-image-files")
  >("@/lib/catalog-image/product-image-files")
  return {
    ...actual,
    findExistingProductImageFiles: (...args: unknown[]) =>
      mockFindExisting(...args),
  }
})

describe("vercel-blob", () => {
  const originalToken = process.env.BLOB_READ_WRITE_TOKEN
  const originalOidcToken = process.env.VERCEL_OIDC_TOKEN
  const originalStoreId = process.env.BLOB_STORE_ID
  const imageDir = path.resolve("/tmp/catalog-images")

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.BLOB_READ_WRITE_TOKEN = "test-blob-token"
    delete process.env.VERCEL_OIDC_TOKEN
    delete process.env.BLOB_STORE_ID
    process.env.CATALOG_PRODUCT_IMAGE_DIR = imageDir
    mockReadFile.mockResolvedValue(Buffer.from("image-bytes"))
    mockPut.mockResolvedValue({
      url: "https://blob.example/products/0101015.png",
      pathname: "products/0101015.png",
    })
  })

  afterEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = originalToken
    process.env.VERCEL_OIDC_TOKEN = originalOidcToken
    process.env.BLOB_STORE_ID = originalStoreId
  })

  it("builds product cloud path with extension", () => {
    expect(getProductCloudPath("0101015", ".png")).toBe("products/0101015.png")
    expect(getProductCloudPath("0101015", "jpg")).toBe("products/0101015.jpg")
  })

  it("throws BLOB_AUTH_NOT_CONFIGURED when no auth env vars are set", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN
    delete process.env.VERCEL_OIDC_TOKEN
    delete process.env.BLOB_STORE_ID

    await expect(listExistingProductCloudImages("0101015")).rejects.toMatchObject({
      code: "BLOB_AUTH_NOT_CONFIGURED",
    })
  })

  it("lists existing cloud images with extension-agnostic duplicate check", async () => {
    mockList.mockResolvedValue({
      blobs: [
        { pathname: "products/0101015.jpg", url: "https://example/a.jpg" },
        { pathname: "products/0101015.gif", url: "https://example/b.gif" },
        { pathname: "products/0202020.png", url: "https://example/c.png" },
      ],
    })

    const existing = await listExistingProductCloudImages("0101015")
    expect(existing).toEqual(["products/0101015.jpg"])
    expect(mockList).toHaveBeenCalledWith({
      prefix: "products/0101015",
      token: "test-blob-token",
    })
  })

  it("listExistingProductCloudImageBlobs returns pathname and url", async () => {
    mockList.mockResolvedValue({
      blobs: [
        {
          pathname: "products/0101001.png",
          url: "https://blob.example/products/0101001.png",
        },
      ],
    })

    await expect(listExistingProductCloudImageBlobs("0101001")).resolves.toEqual([
      {
        pathname: "products/0101001.png",
        url: "https://blob.example/products/0101001.png",
      },
    ])
  })

  it("uses OIDC auth for list when token is absent", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN
    process.env.VERCEL_OIDC_TOKEN = "test-oidc-token"
    process.env.BLOB_STORE_ID = "store_test123"

    mockList.mockResolvedValue({ blobs: [] })

    await listExistingProductCloudImages("0101015")

    expect(mockList).toHaveBeenCalledWith({
      prefix: "products/0101015",
      oidcToken: "test-oidc-token",
      storeId: "store_test123",
    })
    expect(mockList.mock.calls[0]?.[0]).not.toHaveProperty("token")
  })

  it("prefers token auth when both token and OIDC env vars are set", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-blob-token"
    process.env.VERCEL_OIDC_TOKEN = "test-oidc-token"
    process.env.BLOB_STORE_ID = "store_test123"

    mockList.mockResolvedValue({ blobs: [] })

    await listExistingProductCloudImages("0101015")

    expect(mockList).toHaveBeenCalledWith({
      prefix: "products/0101015",
      token: "test-blob-token",
    })
    expect(mockList.mock.calls[0]?.[0]).not.toHaveProperty("oidcToken")
    expect(mockList.mock.calls[0]?.[0]).not.toHaveProperty("storeId")
  })

  it("uploads a local image to blob", async () => {
    const localPath = path.join(imageDir, "0101015.png")
    const result = await uploadProductImageToBlob(localPath, "0101015")

    expect(mockReadFile).toHaveBeenCalledWith(localPath)
    expect(mockPut).toHaveBeenCalledWith(
      "products/0101015.png",
      expect.any(Buffer),
      expect.objectContaining({
        access: "public",
        allowOverwrite: false,
        token: "test-blob-token",
        contentType: "image/png",
      })
    )
    expect(result).toEqual({
      cloudPath: "products/0101015.png",
      url: "https://blob.example/products/0101015.png",
    })
  })

  it("uses OIDC auth for put when token is absent", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN
    process.env.VERCEL_OIDC_TOKEN = "test-oidc-token"
    process.env.BLOB_STORE_ID = "store_test123"

    const localPath = path.join(imageDir, "0101015.png")
    await uploadProductImageToBlob(localPath, "0101015")

    expect(mockPut).toHaveBeenCalledWith(
      "products/0101015.png",
      expect.any(Buffer),
      expect.objectContaining({
        access: "public",
        allowOverwrite: false,
        oidcToken: "test-oidc-token",
        storeId: "store_test123",
        contentType: "image/png",
      })
    )
    expect(mockPut.mock.calls[0]?.[2]).not.toHaveProperty("token")
  })

  it("skips upload when cloud image already exists for product code", async () => {
    mockList.mockResolvedValue({
      blobs: [{ pathname: "products/0101015.webp", url: "https://example/x" }],
    })

    const { results, summary } = await uploadProductImagesToBlob(["0101015"])

    expect(results).toEqual([
      {
        productCode: "0101015",
        status: "SKIPPED_EXISTS",
        cloudPath: "products/0101015.webp",
      },
    ])
    expect(summary).toEqual({
      uploaded: 0,
      skippedExists: 1,
      localMissing: 0,
      localDuplicate: 0,
      unmatchedProduct: 0,
      error: 0,
    })
    expect(mockFindExisting).not.toHaveBeenCalled()
    expect(mockPut).not.toHaveBeenCalled()
  })

  it("returns LOCAL_MISSING when no local file exists", async () => {
    mockList.mockResolvedValue({ blobs: [] })
    mockFindExisting.mockResolvedValue([])

    const { results, summary } = await uploadProductImagesToBlob(["0101015"])

    expect(results[0]).toEqual({
      productCode: "0101015",
      status: "LOCAL_MISSING",
    })
    expect(summary.localMissing).toBe(1)
  })

  it("returns LOCAL_DUPLICATE when multiple local files exist", async () => {
    mockList.mockResolvedValue({ blobs: [] })
    mockFindExisting.mockResolvedValue([
      path.join(imageDir, "0101015.png"),
      path.join(imageDir, "0101015.jpg"),
    ])

    const { results, summary } = await uploadProductImagesToBlob(["0101015"])

    expect(results[0]).toEqual({
      productCode: "0101015",
      status: "LOCAL_DUPLICATE",
    })
    expect(summary.localDuplicate).toBe(1)
    expect(mockPut).not.toHaveBeenCalled()
  })

  it("uploads new local image and returns summary counts", async () => {
    mockList.mockResolvedValue({ blobs: [] })
    mockFindExisting.mockResolvedValue([path.join(imageDir, "0101015.png")])

    const { results, summary } = await uploadProductImagesToBlob(["0101015"])

    expect(results[0]).toEqual(
      expect.objectContaining({
        productCode: "0101015",
        status: "UPLOADED",
        cloudPath: "products/0101015.png",
        url: "https://blob.example/products/0101015.png",
      })
    )
    expect(summary).toEqual({
      uploaded: 1,
      skippedExists: 0,
      localMissing: 0,
      localDuplicate: 0,
      unmatchedProduct: 0,
      error: 0,
    })
  })

  it("scan-all discovers local codes and skips UNMATCHED_PRODUCT", async () => {
    mockReaddir.mockResolvedValue([
      { name: "0101015.png", isFile: () => true },
      { name: "9999999.jpg", isFile: () => true },
      { name: "readme.txt", isFile: () => true },
    ])
    const mockFindUnique = jest.fn(async ({ where }: { where: { code: string } }) =>
      where.code === "0101015" ? { id: "prod-1" } : null
    )
    mockList.mockResolvedValue({ blobs: [] })
    mockFindExisting.mockResolvedValue([path.join(imageDir, "0101015.png")])

    const { results, summary } = await uploadProductImagesToBlob([], {
      db: { product: { findUnique: mockFindUnique } },
    })

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { code: "0101015" },
      select: { id: true },
    })
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { code: "9999999" },
      select: { id: true },
    })
    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productCode: "0101015",
          status: "UPLOADED",
        }),
        expect.objectContaining({
          productCode: "9999999",
          status: "UNMATCHED_PRODUCT",
        }),
      ])
    )
    expect(summary).toEqual({
      uploaded: 1,
      skippedExists: 0,
      localMissing: 0,
      localDuplicate: 0,
      unmatchedProduct: 1,
      error: 0,
    })
  })

  it("scan-all returns SKIPPED_EXISTS, LOCAL_DUPLICATE, and UPLOADED", async () => {
    mockReaddir.mockResolvedValue([
      { name: "0101015.png", isFile: () => true },
      { name: "0202020.jpg", isFile: () => true },
      { name: "0303030.png", isFile: () => true },
      { name: "0303030.webp", isFile: () => true },
    ])
    const mockFindUnique = jest.fn(async () => ({ id: "prod-1" }))
    mockList.mockImplementation(async () => {
      const callCount = mockList.mock.calls.length
      if (callCount === 1) {
        return {
          blobs: [{ pathname: "products/0101015.webp", url: "https://example/x" }],
        }
      }
      return { blobs: [] }
    })
    mockFindExisting.mockImplementation(async (_dir: string, code: string) => {
      if (code === "0202020") return [path.join(imageDir, "0202020.jpg")]
      if (code === "0303030") {
        return [
          path.join(imageDir, "0303030.png"),
          path.join(imageDir, "0303030.webp"),
        ]
      }
      return [path.join(imageDir, `${code}.png`)]
    })

    const { results, summary } = await uploadProductImagesToBlob([], {
      db: { product: { findUnique: mockFindUnique } },
    })

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productCode: "0101015",
          status: "SKIPPED_EXISTS",
        }),
        expect.objectContaining({
          productCode: "0202020",
          status: "UPLOADED",
        }),
        expect.objectContaining({
          productCode: "0303030",
          status: "LOCAL_DUPLICATE",
        }),
      ])
    )
    expect(summary).toEqual({
      uploaded: 1,
      skippedExists: 1,
      localMissing: 0,
      localDuplicate: 1,
      unmatchedProduct: 0,
      error: 0,
    })
  })
})
