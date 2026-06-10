import { resolveCatalogProductImageUrl } from "@/lib/catalog-image/resolve-product-image-url"

jest.mock("@/lib/blob-url", () => ({
  blobUrl: jest.fn((pathname: string) => `/fallback/${pathname}`),
}))

jest.mock("@/lib/catalog-image/vercel-blob", () => ({
  listExistingProductCloudImageBlobs: jest.fn(),
}))

import { blobUrl } from "@/lib/blob-url"
import { listExistingProductCloudImageBlobs } from "@/lib/catalog-image/vercel-blob"

const listBlobsMock = listExistingProductCloudImageBlobs as jest.Mock
const blobUrlMock = blobUrl as jest.Mock

describe("resolveCatalogProductImageUrl", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns null when no cloud images exist", async () => {
    listBlobsMock.mockResolvedValue([])

    await expect(resolveCatalogProductImageUrl("0101001")).resolves.toBeNull()
    expect(blobUrlMock).not.toHaveBeenCalled()
  })

  it("prefers blob.url from Vercel list over blobUrl(pathname)", async () => {
    listBlobsMock.mockResolvedValue([
      {
        pathname: "products/0101001.png",
        url: "https://abc.public.blob.vercel-storage.com/products/0101001.png",
      },
    ])

    await expect(resolveCatalogProductImageUrl("0101001")).resolves.toBe(
      "https://abc.public.blob.vercel-storage.com/products/0101001.png"
    )
    expect(blobUrlMock).not.toHaveBeenCalled()
  })

  it("falls back to blobUrl(pathname) when blob.url is empty", async () => {
    listBlobsMock.mockResolvedValue([
      {
        pathname: "products/0101001.png",
        url: "",
      },
    ])
    blobUrlMock.mockReturnValue("/products/0101001.png")

    await expect(resolveCatalogProductImageUrl("0101001")).resolves.toBe(
      "/products/0101001.png"
    )
    expect(blobUrlMock).toHaveBeenCalledWith("products/0101001.png")
  })

  it("returns null when list throws", async () => {
    listBlobsMock.mockRejectedValue(new Error("BLOB_AUTH_NOT_CONFIGURED"))

    await expect(resolveCatalogProductImageUrl("0101001")).resolves.toBeNull()
  })
})
